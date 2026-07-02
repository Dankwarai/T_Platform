-- Phase 1 (MVP) schema — see CONCEPT.md for the full data model rationale.
-- public.users mirrors auth.users (Supabase Auth owns credentials; we don't
-- store password hashes ourselves).

create extension if not exists "pgcrypto";

create type user_role as enum ('tailor', 'customer');
create type measurement_unit as enum ('cm', 'inch');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  phone text,
  full_name text not null,
  role user_role not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tailor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  business_name text not null,
  bio text,
  location text not null,
  years_experience integer,
  avg_rating numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  preferred_unit measurement_unit not null default 'cm',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.garment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table public.measurement_fields (
  id uuid primary key default gen_random_uuid(),
  garment_type_id uuid not null references public.garment_types (id) on delete cascade,
  field_key text not null,
  field_label text not null,
  display_order integer not null default 0,
  guide_instructions text,
  guide_image_url text,
  unique (garment_type_id, field_key)
);

create table public.measurement_records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  tailor_id uuid references public.tailor_profiles (id) on delete set null,
  garment_type_id uuid not null references public.garment_types (id),
  label text not null,
  unit measurement_unit not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.measurement_values (
  id uuid primary key default gen_random_uuid(),
  measurement_record_id uuid not null references public.measurement_records (id) on delete cascade,
  measurement_field_id uuid not null references public.measurement_fields (id),
  value numeric not null,
  unique (measurement_record_id, measurement_field_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  tailor_id uuid not null references public.tailor_profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_tailor_profiles_user_id on public.tailor_profiles (user_id);
create index idx_customer_profiles_user_id on public.customer_profiles (user_id);
create index idx_measurement_fields_garment_type_id on public.measurement_fields (garment_type_id);
create index idx_measurement_records_customer_id on public.measurement_records (customer_id);
create index idx_measurement_records_tailor_id on public.measurement_records (tailor_id);
create index idx_measurement_values_record_id on public.measurement_values (measurement_record_id);
create index idx_reviews_tailor_id on public.reviews (tailor_id);
create index idx_reviews_customer_id on public.reviews (customer_id);

-- Sync auth.users -> public.users on signup. Expects role/full_name to be
-- passed as auth signup metadata (raw_user_meta_data).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, phone, full_name, role)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep tailor_profiles.avg_rating / rating_count in sync with reviews.
create function public.recalculate_tailor_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_tailor_id uuid := coalesce(new.tailor_id, old.tailor_id);
begin
  update public.tailor_profiles
  set
    avg_rating = coalesce((
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where tailor_id = target_tailor_id
    ), 0),
    rating_count = (
      select count(*)
      from public.reviews
      where tailor_id = target_tailor_id
    )
  where id = target_tailor_id;
  return null;
end;
$$;

create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute function public.recalculate_tailor_rating();
