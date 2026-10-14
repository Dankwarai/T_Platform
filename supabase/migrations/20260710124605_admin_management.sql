-- Admin role capabilities: user/content oversight + editable system config
-- (marketplace commission rate, garment types, product categories — all
-- previously only settable via migration/seed, never through the app).

-- No SECURITY DEFINER needed here, unlike is_job_participant_with /
-- is_order_participant_with in earlier migrations: those need to see
-- *other* users' rows to check a relationship, but this only ever checks
-- the caller's own row, which "users can view own row" RLS already allows.
create function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid () and role = 'admin'
  );
$$;

-- Suspension is stored and admin-manageable here, but deliberately NOT
-- enforced anywhere yet (login, RLS elsewhere) — doing that properly needs
-- either a Supabase auth hook or threading a check through every policy in
-- the schema, which is a separate, much larger change than "view/search
-- users and suspend accounts."
alter table public.users
  add column is_suspended boolean not null default false;

-- Singleton table (Postgres "single row" idiom: boolean primary key that
-- can only ever be `true`, enforced by the check constraint) replacing the
-- commission rate that marketplace_commission.sql hardcoded into
-- create_order(). Admin-only — create_order() is SECURITY DEFINER so it
-- reads this regardless of RLS; no other caller needs direct access.
create table public.platform_settings (
  id boolean primary key default true,
  commission_rate numeric not null default 0.10
    check (commission_rate >= 0 and commission_rate <= 1),
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (id)
);

insert into public.platform_settings (id) values (true);

create function public.touch_platform_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_platform_settings_update_touch
  before update on public.platform_settings
  for each row execute function public.touch_platform_settings_updated_at();

alter table public.platform_settings enable row level security;

create policy "admin can view platform settings" on public.platform_settings
  for select using (public.is_admin ());

create policy "admin can update platform settings" on public.platform_settings
  for update using (public.is_admin ());

-- Third revision of create_order(): only the commission rate source
-- changes (platform_settings instead of a hardcoded constant). Rate is
-- read once at order-creation time and baked into platform_fee_amount, so
-- changing it later only affects future orders — same snapshot-at-purchase
-- reasoning already used for order_items.unit_price_at_purchase.
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
  v_commission_rate numeric;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  select commission_rate into v_commission_rate
  from public.platform_settings where id = true;

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

-- Admin oversight policies — added alongside existing policies, not
-- replacing them.

create policy "admin can view all users" on public.users
  for select using (public.is_admin ());

-- Broad at the RLS layer on purpose: RLS only gates *who* can touch the
-- row at all, same reasoning already used for the jobs/orders update
-- policies. The app only ever writes is_suspended through this policy.
create policy "admin can update any user" on public.users
  for update using (public.is_admin ());

-- customer_profiles has no public-read policy (unlike tailor/supplier
-- profiles) — admin needs an explicit exception to see customer details.
create policy "admin can view any customer profile" on public.customer_profiles
  for select using (public.is_admin ());

create policy "admin can view all jobs" on public.jobs
  for select using (public.is_admin ());

create policy "admin can view all orders" on public.orders
  for select using (public.is_admin ());

create policy "admin can delete any review" on public.reviews
  for delete using (public.is_admin ());

create policy "admin can delete any product review" on public.product_reviews
  for delete using (public.is_admin ());

-- No admin update policy on products — moderation here means removal, not
-- rewriting a supplier's own listing. The existing FK from
-- product_variants/order_items already blocks deleting a product with real
-- order history, which is a useful safety net that already existed.
create policy "admin can delete any product" on public.products
  for delete using (public.is_admin ());

-- garment_types / product_categories: reference data that was previously
-- only ever seeded via migration, with no write policy of any kind. Scope
-- is name/description only — not the per-garment-type measurement fields.
create policy "admin can insert garment types" on public.garment_types
  for insert with check (public.is_admin ());

create policy "admin can update garment types" on public.garment_types
  for update using (public.is_admin ());

create policy "admin can delete garment types" on public.garment_types
  for delete using (public.is_admin ());

create policy "admin can insert product categories" on public.product_categories
  for insert with check (public.is_admin ());

create policy "admin can update product categories" on public.product_categories
  for update using (public.is_admin ());

create policy "admin can delete product categories" on public.product_categories
  for delete using (public.is_admin ());
