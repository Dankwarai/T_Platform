-- User avatars — the last piece of CONCEPT.md's Storage decision.
-- users.avatar_url has existed since Phase 1 but was never wired to any
-- upload UI. Repurposed here to store the storage path (not a full
-- public URL), matching products.images / tailor_profiles.portfolio_images
-- — the column name predates that convention but the behavior now
-- matches it for consistency.
--
-- Simpler RLS than the product/portfolio buckets: objects live at
-- "<auth.uid()>/<uuid>.<ext>" directly (no profile-id indirection needed
-- since every role has exactly one avatar keyed to their own user id).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MiB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "user can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid ()::text
  );

create policy "user can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid ()::text
  );
