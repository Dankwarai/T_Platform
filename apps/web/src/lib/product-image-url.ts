// products.images stores storage paths (not full public URLs) so the
// stored value stays stable if the bucket's public URL host ever
// changes. This is plain string construction (matches Supabase Storage's
// public object URL format) rather than going through a Supabase client,
// so it works the same in both server and client components.
export function getProductImageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}
