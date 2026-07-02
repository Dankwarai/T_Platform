-- Auto-create a blank tailor_profiles / customer_profiles row whenever a
-- public.users row is inserted, based on role. Required fields that aren't
-- known yet at signup (business_name, location) get empty-string
-- placeholders; the user fills them in later via PATCH /tailors/me.

create function public.handle_new_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role = 'tailor' then
    insert into public.tailor_profiles (user_id, business_name, location)
    values (new.id, '', '');
  elsif new.role = 'customer' then
    insert into public.customer_profiles (user_id)
    values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_user_created
  after insert on public.users
  for each row execute function public.handle_new_profile();
