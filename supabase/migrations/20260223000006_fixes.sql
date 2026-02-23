-- Fix: subscription_tier needs a not-null default
alter table public.profiles
  alter column subscription_tier set default 'COMMUNITY',
  alter column subscription_tier set not null;

-- Fix: handle_new_user must also seed user_resources row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  insert into public.user_resources (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;
