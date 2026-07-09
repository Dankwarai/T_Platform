-- Product image uploads via Supabase Storage — the first slice of
-- CONCEPT.md's "File storage: Supabase Storage — Portfolio images,
-- measurement guide images" tech stack decision, which had never
-- actually been built (products.images has sat as an unused text[]
-- since Phase 3 landed).
--
-- Objects are stored at "<product_id>/<uuid>.<ext>" so RLS can scope
-- writes to the owning supplier by folder — storage.foldername(name)
-- splits the object path on "/" and [1] is the product_id segment.
-- products.images itself stores these paths (not full public URLs), so
-- the client resolves the public URL at render time via
-- storage.from('product-images').getPublicUrl(path) — keeps the stored
-- value stable if the bucket's public URL ever changes.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MiB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "supplier can upload own product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.products
      where supplier_id in (select id from public.supplier_profiles where user_id = auth.uid ())
    )
  );

create policy "supplier can delete own product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (
      select id::text from public.products
      where supplier_id in (select id from public.supplier_profiles where user_id = auth.uid ())
    )
  );
