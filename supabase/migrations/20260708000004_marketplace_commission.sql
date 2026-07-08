-- Marketplace commission — resolves CONCEPT.md's deferred "commission/fee
-- model" question. Track-and-display only: platform_fee_amount records
-- the platform's cut of an order for informational display (supplier's
-- order view), it does not change what the buyer is charged or what the
-- create_order()/Paystack flow actually moves — there's no real payout
-- split to suppliers yet, matching CONCEPT.md's note that schema can add
-- this "without breaking anything."
--
-- Rate is hardcoded here rather than a config table, matching how the
-- skill-score formula's weights and tier thresholds are hardcoded
-- directly in their migration — no other business-constant config table
-- exists in this schema to be consistent with.

alter table public.orders
  add column platform_fee_amount numeric not null default 0 check (platform_fee_amount >= 0);

create or replace function public.create_order(
  p_supplier_id uuid,
  p_fulfillment_type order_fulfillment_type,
  p_payment_method order_payment_method,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_variant_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_product_supplier_id uuid;
  v_subtotal numeric;
  v_total numeric := 0;
  v_updated_rows integer;
  v_commission_rate constant numeric := 0.10;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into public.orders (buyer_id, supplier_id, fulfillment_type, payment_method)
  values (auth.uid(), p_supplier_id, p_fulfillment_type, p_payment_method)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantity must be positive';
    end if;

    select pv.price, p.supplier_id into v_price, v_product_supplier_id
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_variant_id
    for update of pv;

    if v_price is null then
      raise exception 'Product variant % not found', v_variant_id;
    end if;

    if v_product_supplier_id <> p_supplier_id then
      raise exception 'Variant % does not belong to supplier %', v_variant_id, p_supplier_id;
    end if;

    update public.product_variants
    set stock_quantity = stock_quantity - v_quantity
    where id = v_variant_id and stock_quantity >= v_quantity;

    get diagnostics v_updated_rows = row_count;
    if v_updated_rows = 0 then
      raise exception 'Insufficient stock for variant %', v_variant_id;
    end if;

    v_subtotal := v_price * v_quantity;
    v_total := v_total + v_subtotal;

    insert into public.order_items (order_id, product_variant_id, quantity, unit_price_at_purchase, subtotal)
    values (v_order_id, v_variant_id, v_quantity, v_price, v_subtotal);
  end loop;

  update public.orders
  set total_amount = v_total, platform_fee_amount = round(v_total * v_commission_rate, 2)
  where id = v_order_id;

  return v_order_id;
end;
$$;
