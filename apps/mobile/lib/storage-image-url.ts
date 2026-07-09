// Storage-backed image columns (products.images,
// tailor_profiles.portfolio_images) store paths within their bucket, not
// full public URLs, so the stored value stays valid if the bucket's
// public host ever changes. Plain string construction matching Supabase
// Storage's public object URL format, no client/network call needed.
export function getStorageImageUrl(bucket: string, path: string): string {
  return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
