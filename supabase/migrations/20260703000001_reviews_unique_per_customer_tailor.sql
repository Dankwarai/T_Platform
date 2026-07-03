-- A customer should only have one review per tailor (editable, not
-- duplicated). Phase 1 has no order/job entity to tie a review to, so this
-- is enforced at the customer+tailor level rather than per completed job —
-- revisit once the order workflow (Phase 3) lands.

alter table public.reviews
  add constraint reviews_customer_tailor_unique unique (customer_id, tailor_id);
