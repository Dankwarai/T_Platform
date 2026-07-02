-- Row-Level Security for Phase 1 tables.

alter table public.users enable row level security;
alter table public.tailor_profiles enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.garment_types enable row level security;
alter table public.measurement_fields enable row level security;
alter table public.measurement_records enable row level security;
alter table public.measurement_values enable row level security;
alter table public.reviews enable row level security;

-- users: only the owner can see/update their own row.
create policy "users can view own row" on public.users
  for select using (auth.uid () = id);

create policy "users can update own row" on public.users
  for update using (auth.uid () = id);

-- tailor_profiles: public read (discovery), owner-only write.
create policy "tailor profiles are publicly readable" on public.tailor_profiles
  for select using (true);

create policy "tailor can update own profile" on public.tailor_profiles
  for update using (
    user_id = auth.uid ()
  );

create policy "tailor can insert own profile" on public.tailor_profiles
  for insert with check (
    user_id = auth.uid ()
  );

-- customer_profiles: private to the owning customer.
create policy "customer can view own profile" on public.customer_profiles
  for select using (user_id = auth.uid ());

create policy "customer can update own profile" on public.customer_profiles
  for update using (user_id = auth.uid ());

create policy "customer can insert own profile" on public.customer_profiles
  for insert with check (user_id = auth.uid ());

-- garment_types / measurement_fields: public reference data, read-only to clients.
create policy "garment types are publicly readable" on public.garment_types
  for select using (true);

create policy "measurement fields are publicly readable" on public.measurement_fields
  for select using (true);

-- measurement_records: visible/editable by the owning customer or the tailor on the record.
create policy "owner or assigned tailor can view measurement records" on public.measurement_records
  for select using (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    or tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
  );

create policy "owner or assigned tailor can insert measurement records" on public.measurement_records
  for insert with check (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    or tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
  );

create policy "owner or assigned tailor can update measurement records" on public.measurement_records
  for update using (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    or tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
  );

create policy "owner or assigned tailor can delete measurement records" on public.measurement_records
  for delete using (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    or tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
  );

-- measurement_values: access follows the parent measurement_record.
create policy "values follow parent record visibility" on public.measurement_values
  for select using (
    measurement_record_id in (
      select id from public.measurement_records
      where customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
         or tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
    )
  );

create policy "values follow parent record write access" on public.measurement_values
  for all using (
    measurement_record_id in (
      select id from public.measurement_records
      where customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
         or tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
    )
  );

-- reviews: public read, only the reviewing customer can write/edit/delete their own.
create policy "reviews are publicly readable" on public.reviews
  for select using (true);

create policy "customer can create own review" on public.reviews
  for insert with check (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
  );

create policy "customer can update own review" on public.reviews
  for update using (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
  );

create policy "customer can delete own review" on public.reviews
  for delete using (
    customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
  );
