-- Follow suggestions: composite score from CONCEPT.md's Phase 2 design.
--   suggestion_score =
--       (mutual_connections_count * 3)
--     + (location_match ? 2 : 0)
--     + (specialty_match_count * 2)
--     + (trending_score * 1)   -- follows in the trailing 7 days
--
-- Weights are a starting guess, not tuned — revisit once there's real
-- usage data. Only tailors are candidates today (the only followable/
-- rankable entity in the UI); suppliers join this pool in Phase 3.
--
-- No SECURITY DEFINER needed: follows/tailor_specialties/tailor_profiles
-- are all public-read via RLS, so the querying user's own session can
-- already see everything this function touches.
create function public.get_follow_suggestions(p_user_id uuid, p_limit int default 10)
returns table (
  candidate_user_id uuid,
  tailor_id uuid,
  business_name text,
  location text,
  avg_rating numeric,
  follower_count integer,
  suggestion_score numeric
)
language sql
stable
set search_path = public
as $$
  with my_location as (
    select coalesce(
      (select location from public.tailor_profiles where user_id = p_user_id),
      (select location from public.customer_profiles where user_id = p_user_id)
    ) as location
  ),
  my_specialties as (
    select ts.garment_type_id
    from public.tailor_specialties ts
    join public.tailor_profiles tp on tp.id = ts.tailor_id
    where tp.user_id = p_user_id
    union
    select mr.garment_type_id
    from public.measurement_records mr
    join public.customer_profiles cp on cp.id = mr.customer_id
    where cp.user_id = p_user_id
  ),
  my_following as (
    select followee_id from public.follows where follower_id = p_user_id
  ),
  candidates as (
    select
      tp.user_id as candidate_user_id,
      tp.id as tailor_id,
      tp.business_name,
      tp.location,
      tp.avg_rating,
      tp.follower_count
    from public.tailor_profiles tp
    where tp.user_id <> p_user_id
      and tp.business_name <> ''
      and tp.user_id not in (select followee_id from my_following)
  ),
  mutual as (
    select f2.followee_id as candidate_user_id, count(*) as mutual_count
    from public.follows f2
    where f2.follower_id in (select followee_id from my_following)
      and f2.followee_id in (select candidate_user_id from candidates)
    group by f2.followee_id
  ),
  specialty_match as (
    select ts.tailor_id, count(*) as match_count
    from public.tailor_specialties ts
    where ts.garment_type_id in (select garment_type_id from my_specialties)
    group by ts.tailor_id
  ),
  trending as (
    select followee_id, count(*) as recent_follows
    from public.follows
    where created_at > now() - interval '7 days'
    group by followee_id
  )
  select
    c.candidate_user_id,
    c.tailor_id,
    c.business_name,
    c.location,
    c.avg_rating,
    c.follower_count,
    (
      coalesce(m.mutual_count, 0) * 3
      + (case
          when c.location is not null
            and c.location = (select location from my_location)
          then 2
          else 0
        end)
      + coalesce(sm.match_count, 0) * 2
      + coalesce(t.recent_follows, 0) * 1
    )::numeric as suggestion_score
  from candidates c
  left join mutual m on m.candidate_user_id = c.candidate_user_id
  left join specialty_match sm on sm.tailor_id = c.tailor_id
  left join trending t on t.followee_id = c.candidate_user_id
  order by suggestion_score desc, c.avg_rating desc, c.follower_count desc
  limit p_limit;
$$;
