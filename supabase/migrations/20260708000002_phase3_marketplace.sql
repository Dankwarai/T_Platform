-- Phase 3: supplier marketplace — see CONCEPT.md's Phase 3 section.
--
-- Decisions made when starting this phase (not in the original CONCEPT.md
-- draft, resolved before writing schema):
--   - Reviews extend to products (not just tailors): a `product_reviews`
--     table, gated to buyers with a completed order containing that
--     product (Phase 1's "no order entity to tie a review to" blocker no
--     longer applies now that orders exist).
--   - Stock decrements at order creation time, not confirmation, to
--     prevent overselling. Done atomically in a single SECURITY DEFINER
--     function (`create_order`) rather than separate client-side inserts,
--     so the stock check-and-decrement and the order/order_items rows are
--     all one transaction. `for update` row locks on the variant rows
--     serialize concurrent buyers instead of racing.

create table public.supplier_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  business_name text not null,
  bio text,
  location text not null,
  follower_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_supplier_profiles_user_id on public.supplier_profiles (user_id);

-- Extend the Phase 1 signup trigger to also create a blank supplier_profiles
-- row, matching the tailor/customer pattern.
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role = 'tailor' then
    insert into public.tailor_profiles (user_id, business_name, location)
    values (new.id, '', '');
  elsif new.role = 'customer' then
    insert into public.customer_profiles (user_id)
    values (new.id);
  elsif new.role = 'supplier' then
    insert into public.supplier_profiles (user_id, business_name, location)
    values (new.id, '', '');
  end if;
  return new;
end;
$$;

-- Extend Phase 2's generic follows table to also drive supplier
-- follower_count, per CONCEPT.md's Phase 3 note. Harmless no-op update on
-- whichever profile table the followee doesn't belong to.
create or replace function public.recalculate_follower_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_user_id uuid := coalesce(new.followee_id, old.followee_id);
  v_count integer;
begin
  select count(*) into v_count from public.follows where followee_id = target_user_id;

  update public.tailor_profiles set follower_count = v_count where user_id = target_user_id;
  update public.supplier_profiles set follower_count = v_count where user_id = target_user_id;

  return null;
end;
$$;

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.supplier_profiles (id) on delete cascade,
  category_id uuid not null references public.product_categories (id),
  name text not null,
  description text,
  images text[] not null default '{}',
  avg_rating numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_supplier_id on public.products (supplier_id);
create index idx_products_category_id on public.products (category_id);

create type product_unit_type as enum ('yard', 'meter', 'piece', 'kg');

-- stock_quantity is numeric (not integer) since fabric is commonly sold in
-- fractional yards/meters, per CONCEPT.md.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_name text not null,
  unit_type product_unit_type not null,
  price numeric not null check (price >= 0),
  stock_quantity numeric not null default 0 check (stock_quantity >= 0),
  sku text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_product_variants_product_id on public.product_variants (product_id);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index idx_product_reviews_product_id on public.product_reviews (product_id);

-- Keep products.avg_rating / rating_count in sync, mirroring Phase 1's
-- recalculate_tailor_rating.
create function public.recalculate_product_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products
  set
    avg_rating = coalesce((
      select round(avg(rating)::numeric, 2)
      from public.product_reviews
      where product_id = target_product_id
    ), 0),
    rating_count = (
      select count(*)
      from public.product_reviews
      where product_id = target_product_id
    )
  where id = target_product_id;
  return null;
end;
$$;

create trigger on_product_review_change
  after insert or update or delete on public.product_reviews
  for each row execute function public.recalculate_product_rating();

create type order_status as enum ('pending', 'confirmed', 'ready', 'completed', 'cancelled');
create type order_fulfillment_type as enum ('supplier_shipping', 'local_pickup');
create type order_payment_method as enum ('in_app', 'offline');
create type order_payment_status as enum ('pending', 'paid', 'failed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.users (id) on delete cascade,
  supplier_id uuid not null references public.supplier_profiles (id) on delete cascade,
  status order_status not null default 'pending',
  fulfillment_type order_fulfillment_type not null,
  payment_method order_payment_method not null,
  payment_status order_payment_status not null default 'pending',
  total_amount numeric not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_buyer_id on public.orders (buyer_id);
create index idx_orders_supplier_id on public.orders (supplier_id);

-- unit_price_at_purchase / subtotal are snapshots, protecting the order
-- record against later price changes on the variant, per CONCEPT.md.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id),
  quantity numeric not null check (quantity > 0),
  unit_price_at_purchase numeric not null check (unit_price_at_purchase >= 0),
  subtotal numeric not null check (subtotal >= 0)
);

create index idx_order_items_order_id on public.order_items (order_id);

create function public.touch_order_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_order_update_touch
  before update on public.orders
  for each row execute function public.touch_order_updated_at();

-- The only way to create an order: validates every variant belongs to the
-- given supplier, locks and decrements stock (raising if insufficient),
-- and snapshots unit prices — all in one transaction so a failure at any
-- item rolls back the whole order instead of leaving a partial one. No
-- direct insert policy exists on orders/order_items (see RLS below); this
-- SECURITY DEFINER function is the only writer.
create function public.create_order(
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

  update public.orders set total_amount = v_total where id = v_order_id;

  return v_order_id;
end;
$$;

-- Restore stock when an order is cancelled, so a decrement at creation
-- time doesn't permanently lock stock if the order never fulfills.
create function public.restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.product_variants pv
    set stock_quantity = pv.stock_quantity + oi.quantity
    from public.order_items oi
    where oi.order_id = new.id and oi.product_variant_id = pv.id;
  end if;
  return null;
end;
$$;

create trigger on_order_cancel_restore_stock
  after update on public.orders
  for each row execute function public.restore_stock_on_cancel();

alter table public.supplier_profiles enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_reviews enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- supplier_profiles: public read (discovery), owner-only write — mirrors
-- tailor_profiles.
create policy "supplier profiles are publicly readable" on public.supplier_profiles
  for select using (true);

create policy "supplier can update own profile" on public.supplier_profiles
  for update using (user_id = auth.uid ());

create policy "supplier can insert own profile" on public.supplier_profiles
  for insert with check (user_id = auth.uid ());

-- product_categories: public reference data, read-only to clients.
create policy "product categories are publicly readable" on public.product_categories
  for select using (true);

-- products / product_variants: public read (browse/search), owning
-- supplier manages their own.
create policy "products are publicly readable" on public.products
  for select using (true);

create policy "supplier can manage own products" on public.products
  for all using (
    supplier_id in (select id from public.supplier_profiles where user_id = auth.uid ())
  );

create policy "product variants are publicly readable" on public.product_variants
  for select using (true);

create policy "supplier can manage own product variants" on public.product_variants
  for all using (
    product_id in (
      select id from public.products
      where supplier_id in (select id from public.supplier_profiles where user_id = auth.uid ())
    )
  );

-- product_reviews: public read; a customer can only review a product
-- they've actually bought (order buyer, order status = completed).
create policy "product reviews are publicly readable" on public.product_reviews
  for select using (true);

create policy "customer can review purchased products" on public.product_reviews
  for insert with check (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      join public.product_variants pv on pv.id = oi.product_variant_id
      where o.buyer_id = auth.uid ()
        and o.status = 'completed'
        and pv.product_id = product_reviews.product_id
    )
  );

create policy "customer can update own product review" on public.product_reviews
  for update using (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
  );

create policy "customer can delete own product review" on public.product_reviews
  for delete using (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
  );

-- orders / order_items: visible to either participant (buyer or the
-- receiving supplier). No insert policy on either table — create_order()
-- is SECURITY DEFINER and is the only writer, so a client can't bypass its
-- stock checks by inserting rows directly. Status updates are allowed for
-- either participant; the app layer decides which transitions are valid
-- to expose per role/current status, same as the jobs table.
create policy "order participants can view" on public.orders
  for select using (
    buyer_id = auth.uid ()
    or supplier_id in (select id from public.supplier_profiles where user_id = auth.uid ())
  );

create policy "order participants can update status" on public.orders
  for update using (
    buyer_id = auth.uid ()
    or supplier_id in (select id from public.supplier_profiles where user_id = auth.uid ())
  );

create policy "order participants can view items" on public.order_items
  for select using (
    order_id in (
      select id from public.orders
      where buyer_id = auth.uid ()
         or supplier_id in (select id from public.supplier_profiles where user_id = auth.uid ())
    )
  );

-- Learned from the Phase 3 job workflow: a supplier needs to see the
-- buyer's name (users.full_name) on a shared order and vice versa, but
-- users' base RLS only allows viewing your own row. SECURITY DEFINER so
-- the relationship check itself can see both sides regardless of the
-- caller's own row-level restrictions on supplier_profiles.
create function public.is_order_participant_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.supplier_profiles sp on sp.id = o.supplier_id
    where (o.buyer_id = auth.uid () and sp.user_id = target_user_id)
       or (sp.user_id = auth.uid () and o.buyer_id = target_user_id)
  );
$$;

create policy "order participants can view each other's user row" on public.users
  for select using (public.is_order_participant_with (id));
