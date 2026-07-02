-- RLS policies only restrict *which rows* a role can see/change — Postgres
-- still requires base table-level GRANTs before RLS is evaluated at all.
-- Supabase-hosted projects set these up automatically; a from-scratch
-- schema (like this one) needs them added explicitly, otherwise every
-- request from anon/authenticated fails with "permission denied" before
-- RLS policies are ever consulted.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
