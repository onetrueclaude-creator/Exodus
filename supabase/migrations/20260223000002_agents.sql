create table public.agents (
  id               text primary key,
  user_id          uuid references public.profiles(user_id) on delete set null,
  chain_x          integer not null,
  chain_y          integer not null,
  visual_x         float not null,
  visual_y         float not null,
  tier             text not null default 'haiku' check (tier in ('haiku','sonnet','opus')),
  is_primary       boolean default false,
  username         text,
  bio              text,
  intro_message    text,
  density          float default 0,
  storage_slots    integer default 1,
  stake            integer default 0,
  border_radius    float default 30,
  mining_rate      float default 0,
  cpu_per_turn     integer default 0,
  staked_cpu       integer default 0,
  parent_agent_id  text references public.agents(id) on delete set null,
  synced_at        timestamptz default now()
);

alter table public.agents enable row level security;

create policy "authenticated users can read agents"
  on public.agents for select
  to authenticated
  using (true);

create policy "service role can write agents"
  on public.agents for all
  to service_role
  using (true);

create index agents_user_id_idx on public.agents(user_id);
create index agents_coords_idx on public.agents(chain_x, chain_y);

alter publication supabase_realtime add table public.agents;
