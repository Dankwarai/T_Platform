-- Customers had no self-service profile page at all — tailors and
-- suppliers both got one early on, customers were left with only the
-- auto-created blank row and no editable bio to match. customer_profiles
-- stays private (no public-read policy, unlike tailor/supplier_profiles),
-- so no avatar_path here — there's no page that would ever display it.

alter table public.customer_profiles
  add column bio text;
