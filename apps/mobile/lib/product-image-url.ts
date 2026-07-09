// products.images stores storage paths (not full public URLs) so the
// stored value stays stable if the bucket's public URL host ever
// changes. Plain string construction matching Supabase Storage's public
// object URL format, no client/network call needed.
export function getProductImageUrl(path: string): string {
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
}
