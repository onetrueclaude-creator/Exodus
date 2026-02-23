-- profiles extends auth.users (Supabase Auth manages email/OAuth)
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  subscription_tier text check (subscription_tier in ('COMMUNITY','PROFESSIONAL','MAX')),
  phantom_wallet_hash text unique,
  blockchain_token_x integer,
  blockchain_token_y integer,
  start_agent_id text,
  empire_color   integer default 9175807,
  max_deploy_tier text default 'haiku' check (max_deploy_tier in ('haiku','sonnet','opus')),
  created_at   timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
