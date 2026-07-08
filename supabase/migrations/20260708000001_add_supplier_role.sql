-- Adding 'supplier' as its own migration: Postgres forbids using a newly
-- added enum value in the same transaction it was added in, and the next
-- migration's handle_new_profile() update needs to reference it.

alter type public.user_role add value if not exists 'supplier';
