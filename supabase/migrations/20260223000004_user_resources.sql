create table public.user_resources (
  user_id        uuid primary key references public.profiles(user_id) on delete cascade,
  energy         float default 1000,
  minerals       float default 50,
  agntc_balance  float default 50,
  secured_chains integer default 0,
  turn           integer default 0,
  updated_at     timestamptz default now()
);

alter table public.user_resources enable row level security;

create policy "users can read own resources"
  on public.user_resources for select
  using (auth.uid() = user_id);

create policy "users can update own resources"
  on public.user_resources for update
  using (auth.uid() = user_id);

create policy "service role can write resources"
  on public.user_resources for all
  to service_role
  using (true);
