-- Course-correction from the previous migration: users.avatar_url is
-- unusable for a *public* avatar because users' RLS only grants
-- "view own row" — the same problem the jobs workflow hit needing
-- SECURITY DEFINER helpers for cross-participant visibility. Rather than
-- add another RLS workaround, this puts the avatar where the rest of the
-- public profile already lives: tailor_profiles / supplier_profiles are
-- already publicly readable, matching business_name/bio/location/
-- portfolio_images. users.avatar_url stays as-is, unused for now.
--
-- Storage stays exactly as the previous migration set up (bucket
-- "avatars", RLS keyed by auth.uid() folder) — only which table gets
-- updated after upload changes, not the bucket or its policies.

alter table public.tailor_profiles
  add column avatar_path text;

alter table public.supplier_profiles
  add column avatar_path text;
