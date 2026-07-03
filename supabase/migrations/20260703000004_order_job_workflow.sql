-- Order/job workflow — full design from CONCEPT.md: standard + custom
-- pricing, broad status stages with a fitting-iteration loop, and a
-- status-change audit log.

create type job_status as enum (
  'requested', 'accepted', 'rejected', 'in_progress',
  'ready_for_fitting', 'adjusting', 'completed', 'delivered', 'cancelled'
);
create type job_price_type as enum ('standard', 'custom');
create type job_payment_status as enum ('pending', 'paid');
create type job_payment_method as enum ('in_app', 'offline');
create type job_fit_confirmation as enum ('yes', 'somewhat', 'no');

create table public.tailor_service_prices (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailor_profiles (id) on delete cascade,
  garment_type_id uuid not null references public.garment_types (id) on delete cascade,
  price numeric not null check (price >= 0),
  unique (tailor_id, garment_type_id)
);

create index idx_tailor_service_prices_tailor_id on public.tailor_service_prices (tailor_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  measurement_record_id uuid not null references public.measurement_records (id) on delete cascade,
  tailor_id uuid not null references public.tailor_profiles (id) on delete cascade,
  garment_type_id uuid not null references public.garment_types (id),
  status job_status not null default 'requested',
  price numeric check (price >= 0),
  price_type job_price_type,
  payment_status job_payment_status not null default 'pending',
  payment_method job_payment_method,
  fitting_iteration_count integer not null default 0,
  due_date date,
  completed_at timestamptz,
  fit_confirmation job_fit_confirmation,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_jobs_measurement_record_id on public.jobs (measurement_record_id);
create index idx_jobs_tailor_id on public.jobs (tailor_id);

create table public.job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.users (id),
  note text,
  created_at timestamptz not null default now()
);

create index idx_job_status_history_job_id on public.job_status_history (job_id);

-- Keep updated_at current on every update.
create function public.touch_job_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_job_update_touch
  before update on public.jobs
  for each row execute function public.touch_job_updated_at();

-- Auto-log every status change (including the initial insert). Must run
-- AFTER the row exists — job_status_history.job_id has a FK to jobs, and a
-- BEFORE INSERT trigger fires before the row is visible to that check.
-- SECURITY DEFINER so it can write to job_status_history regardless of the
-- caller's own write privileges there (regular users have no direct insert
-- policy on that table — it's a read-only audit trail from their
-- perspective).
create function public.log_job_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.job_status_history (job_id, from_status, to_status, changed_by)
    values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status::text end,
      new.status::text,
      auth.uid()
    );
  end if;

  return null;
end;
$$;

create trigger on_job_status_change
  after insert or update on public.jobs
  for each row execute function public.log_job_status_change();

alter table public.tailor_service_prices enable row level security;
alter table public.jobs enable row level security;
alter table public.job_status_history enable row level security;

-- tailor_service_prices: public read (customers see standard rates before
-- requesting), owning tailor manages their own.
create policy "service prices are publicly readable" on public.tailor_service_prices
  for select using (true);

create policy "tailor can manage own service prices" on public.tailor_service_prices
  for all using (
    tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
  );

-- jobs: visible to the customer (via their measurement_record) or the
-- assigned tailor. Only the customer can create a request (for their own
-- measurement_record); either participant can update thereafter — the
-- app layer decides which status transitions are valid to expose per
-- role/current-status, RLS only gates *who* can touch the row at all.
create policy "job participants can view" on public.jobs
  for select using (
    tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
    or measurement_record_id in (
      select id from public.measurement_records
      where customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    )
  );

create policy "customer can request a job" on public.jobs
  for insert with check (
    measurement_record_id in (
      select id from public.measurement_records
      where customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    )
  );

create policy "job participants can update" on public.jobs
  for update using (
    tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
    or measurement_record_id in (
      select id from public.measurement_records
      where customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
    )
  );

-- job_status_history: read-only audit trail for participants. No
-- insert/update/delete policy — only the SECURITY DEFINER trigger writes
-- to it.
create policy "job participants can view history" on public.job_status_history
  for select using (
    job_id in (
      select id from public.jobs
      where tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
         or measurement_record_id in (
           select id from public.measurement_records
           where customer_id in (select id from public.customer_profiles where user_id = auth.uid ())
         )
    )
  );

-- A tailor needs to see the customer's name (users.full_name) on a shared
-- job, and vice versa — users' base RLS only allows viewing your own row,
-- so job participants need an explicit exception.
--
-- This has to be a SECURITY DEFINER function, not an inline policy
-- subquery: the subquery joins customer_profiles and tailor_profiles,
-- which have their own restrictive RLS ("view own profile only"). Under a
-- plain policy, that join runs as the *calling* role, so e.g. a tailor's
-- session can't see the customer's customer_profiles row at all and the
-- whole join silently returns zero rows — regardless of whether they
-- actually share a job. SECURITY DEFINER bypasses RLS inside the function
-- so the relationship check itself can see everything it needs to.
create function public.is_job_participant_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.jobs j
    join public.tailor_profiles tp on tp.id = j.tailor_id
    join public.measurement_records mr on mr.id = j.measurement_record_id
    join public.customer_profiles cp on cp.id = mr.customer_id
    where (tp.user_id = auth.uid () and cp.user_id = target_user_id)
       or (cp.user_id = auth.uid () and tp.user_id = target_user_id)
  );
$$;

create policy "job participants can view each other's user row" on public.users
  for select using (public.is_job_participant_with (id));

-- measurement_records' existing RLS only grants a tailor visibility via
-- measurement_records.tailor_id (Phase 1's in-person tailor-assisted
-- measurement, never actually built) — it has no clause for "this tailor
-- has an active job referencing this record" instead. Without it, a
-- tailor's job list can see the job row itself but the embedded
-- measurement_records comes back null.
--
-- This has to be SECURITY DEFINER, not a plain policy subquery against
-- jobs: jobs' own SELECT policy ("job participants can view") references
-- measurement_records right back (to check customer ownership) — a plain
-- subquery here would create a circular RLS dependency and Postgres
-- rejects it outright with "infinite recursion detected in policy for
-- relation measurement_records" (42P17). SECURITY DEFINER bypasses RLS
-- inside the function, breaking the cycle.
create function public.is_job_tailor_for_record(record_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.jobs j
    join public.tailor_profiles tp on tp.id = j.tailor_id
    where j.measurement_record_id = record_id
      and tp.user_id = auth.uid ()
  );
$$;

create policy "job tailor can view associated measurement record" on public.measurement_records
  for select using (public.is_job_tailor_for_record (id));

-- Same problem one link further down the chain: the job detail/list pages
-- embed measurement_records(customer_profiles(users(full_name))) to show
-- the tailor who the customer is. customer_profiles' own RLS ("customer
-- can view own profile") blocks the tailor from reading that row at all,
-- so the embed still comes back null even with the two fixes above.
create function public.is_job_tailor_for_customer(target_customer_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.jobs j
    join public.tailor_profiles tp on tp.id = j.tailor_id
    join public.measurement_records mr on mr.id = j.measurement_record_id
    where mr.customer_id = target_customer_profile_id
      and tp.user_id = auth.uid ()
  );
$$;

create policy "job tailor can view associated customer profile" on public.customer_profiles
  for select using (public.is_job_tailor_for_customer (id));
