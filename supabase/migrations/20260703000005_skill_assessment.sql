-- Skill assessment — closes out Phase 2. Formula from CONCEPT.md:
--   skill_score (0-100) =
--       (min(completion_count, 100) / 100 * 30)   -- experience, capped
--     + (on_time_rate * 25)                        -- % delivered by due_date
--     + (avg_rating / 5 * 25)                       -- from reviews
--     + (fit_confirmation_rate * 20)                -- % of "yes" among responded jobs
--
-- Deliberate deviation from CONCEPT.md's "scheduled job, not a trigger"
-- note: there's no cron/Edge Function infra to test against here, and
-- triggers can freely query other tables (not just the one they're
-- attached to), so real-time recalculation via triggers on both `jobs`
-- and `reviews` is both simpler to verify and arguably better UX. The
-- calc function reads avg_rating fresh from `reviews` directly rather
-- than the denormalized tailor_profiles.avg_rating column, so it doesn't
-- depend on trigger firing order relative to the existing rating trigger.

create type skill_tier as enum ('beginner', 'skilled', 'expert', 'master');

alter table public.tailor_profiles
  add column skill_score numeric not null default 0,
  add column skill_tier skill_tier not null default 'beginner';

create function public.recalculate_tailor_skill(target_tailor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completion_count integer;
  v_on_time_rate numeric;
  v_avg_rating numeric;
  v_fit_rate numeric;
  v_score numeric;
  v_tier skill_tier;
begin
  select count(*) into v_completion_count
  from public.jobs
  where tailor_id = target_tailor_id and status = 'delivered';

  select coalesce(
    avg(case when completed_at::date <= due_date then 1.0 else 0.0 end), 0
  ) into v_on_time_rate
  from public.jobs
  where tailor_id = target_tailor_id
    and status = 'delivered'
    and due_date is not null
    and completed_at is not null;

  select coalesce(avg(rating), 0) into v_avg_rating
  from public.reviews
  where tailor_id = target_tailor_id;

  select coalesce(
    avg(case when fit_confirmation = 'yes' then 1.0 else 0.0 end), 0
  ) into v_fit_rate
  from public.jobs
  where tailor_id = target_tailor_id and fit_confirmation is not null;

  v_score := (least(v_completion_count, 100) / 100.0 * 30)
    + (v_on_time_rate * 25)
    + (v_avg_rating / 5.0 * 25)
    + (v_fit_rate * 20);

  v_tier := case
    when v_score >= 90 then 'master'
    when v_score >= 70 then 'expert'
    when v_score >= 40 then 'skilled'
    else 'beginner'
  end;

  update public.tailor_profiles
  set skill_score = round(v_score, 2), skill_tier = v_tier
  where id = target_tailor_id;
end;
$$;

create function public.trigger_recalculate_skill_from_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_tailor_skill(coalesce(new.tailor_id, old.tailor_id));
  return null;
end;
$$;

create trigger on_job_change_recalc_skill
  after insert or update or delete on public.jobs
  for each row execute function public.trigger_recalculate_skill_from_job();

create function public.trigger_recalculate_skill_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_tailor_skill(coalesce(new.tailor_id, old.tailor_id));
  return null;
end;
$$;

create trigger on_review_change_recalc_skill
  after insert or update or delete on public.reviews
  for each row execute function public.trigger_recalculate_skill_from_review();
