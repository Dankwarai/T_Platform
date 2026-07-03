-- Phase 2: follow system + tailor specialties + follower_count.
-- See CONCEPT.md's Phase 2 section for the design rationale.

-- customer_profiles needs a location so the follow-suggestions algorithm's
-- "location match" signal has something to compare against for customers
-- too (tailor_profiles already has one). Not in the original Phase 1 model.
alter table public.customer_profiles
  add column location text;

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.users (id) on delete cascade,
  followee_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index idx_follows_follower_id on public.follows (follower_id);
create index idx_follows_followee_id on public.follows (followee_id);
create index idx_follows_created_at on public.follows (created_at);

create table public.tailor_specialties (
  id uuid primary key default gen_random_uuid(),
  tailor_id uuid not null references public.tailor_profiles (id) on delete cascade,
  garment_type_id uuid not null references public.garment_types (id) on delete cascade,
  unique (tailor_id, garment_type_id)
);

create index idx_tailor_specialties_tailor_id on public.tailor_specialties (tailor_id);
create index idx_tailor_specialties_garment_type_id on public.tailor_specialties (garment_type_id);

alter table public.tailor_profiles
  add column follower_count integer not null default 0;

-- Keep tailor_profiles.follower_count in sync. Only tailors are rankable/
-- followable targets in the UI today, so this only updates when the
-- followee happens to be a tailor (a no-op update otherwise).
create function public.recalculate_follower_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_user_id uuid := coalesce(new.followee_id, old.followee_id);
begin
  update public.tailor_profiles
  set follower_count = (
    select count(*) from public.follows where followee_id = target_user_id
  )
  where user_id = target_user_id;
  return null;
end;
$$;

create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.recalculate_follower_count();

alter table public.follows enable row level security;
alter table public.tailor_specialties enable row level security;

-- follows: public read (follower lists/counts are social, not private),
-- a user can only create/delete their own outgoing follow.
create policy "follows are publicly readable" on public.follows
  for select using (true);

create policy "users can follow as themselves" on public.follows
  for insert with check (follower_id = auth.uid ());

create policy "users can unfollow their own follows" on public.follows
  for delete using (follower_id = auth.uid ());

-- tailor_specialties: public read, owning tailor manages their own.
create policy "tailor specialties are publicly readable" on public.tailor_specialties
  for select using (true);

create policy "tailor can manage own specialties" on public.tailor_specialties
  for all using (
    tailor_id in (select id from public.tailor_profiles where user_id = auth.uid ())
  );
