-- Adding 'admin' as its own migration: Postgres forbids using a newly
-- added enum value in the same transaction it was added in, and the next
-- migration's is_admin() / RLS policies need to reference it. Same reason
-- 'supplier' got its own migration (see add_supplier_role.sql).
--
-- Unlike tailor/customer/supplier, admin accounts are never created via
-- /signup — there is no branch for 'admin' in handle_new_profile() and none
-- is added here. The only way to become admin is a direct UPDATE against
-- public.users, done once by hand for the first account.

alter type public.user_role add value if not exists 'admin';
