-- Adding 'deposit_paid' as its own migration: Postgres forbids using a
-- newly added enum value in the same transaction it was added in, and the
-- next migration's create_order()/webhook logic needs to reference it.

alter type public.job_payment_status add value if not exists 'deposit_paid';
