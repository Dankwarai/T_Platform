-- Tailor portfolio images — the second slice of CONCEPT.md's Storage
-- decision, and the other half of "Customer discovery — find and follow
-- top tailors, view portfolios" (Phase 1 vision), which had no image
-- support at all: tailor_profiles never even had a column for it.
--
-- Mirrors the product-images bucket exactly: objects live at
-- "<tailor_profile_id>/<uuid>.<ext>", RLS scopes writes to the owning
-- tailor by folder, and tailor_profiles.portfolio_images stores paths
-- (not full public URLs) for the same reason products.images does.

alter table public.tailor_profiles
  add column portfolio_images text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tailor-portfolio-images',
  'tailor-portfolio-images',
  true,
  5242880, -- 5MiB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "portfolio images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'tailor-portfolio-images');

create policy "tailor can upload own portfolio images"
  on storage.objects for insert
  with check (
    bucket_id = 'tailor-portfolio-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailor_profiles where user_id = auth.uid ()
    )
  );

create policy "tailor can delete own portfolio images"
  on storage.objects for delete
  using (
    bucket_id = 'tailor-portfolio-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.tailor_profiles where user_id = auth.uid ()
    )
  );
