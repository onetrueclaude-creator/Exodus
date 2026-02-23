create table public.planets (
  id                text primary key,
  agent_id          text references public.agents(id) on delete cascade,
  user_id           uuid references public.profiles(user_id) on delete cascade,
  content           text not null default '',
  content_type      text default 'post' check (content_type in ('post','text','chat','prompt')),
  is_zero_knowledge boolean default false,
  created_at        timestamptz default now()
);

alter table public.planets enable row level security;
create policy "users can manage own planets" on public.planets for all using (auth.uid() = user_id);
create policy "public can read non-zk planets" on public.planets for select using (not is_zero_knowledge);

create table public.haiku_messages (
  id              text primary key,
  sender_agent_id text references public.agents(id) on delete set null,
  text            text not null,
  syllables       integer[] default '{5,7,5}',
  position_x      float not null,
  position_y      float not null,
  timestamp       bigint not null
);

alter table public.haiku_messages enable row level security;
create policy "authenticated can read haiku" on public.haiku_messages for select to authenticated using (true);
create policy "authenticated can insert haiku" on public.haiku_messages for insert to authenticated with check (true);

alter publication supabase_realtime add table public.haiku_messages;

create table public.chain_messages (
  id               text primary key,
  sender_chain_x   integer not null,
  sender_chain_y   integer not null,
  target_chain_x   integer not null,
  target_chain_y   integer not null,
  text             text not null,
  timestamp        bigint not null
);

alter table public.chain_messages enable row level security;
create policy "authenticated can read chain_messages" on public.chain_messages for select to authenticated using (true);
create policy "service role can write chain_messages" on public.chain_messages for all to service_role using (true);

create table public.diplomatic_states (
  agent_a_id     text not null,
  agent_b_id     text not null,
  exchange_count integer default 0,
  opinion        float default 0,
  clarity_level  integer default 0,
  last_exchange  bigint,
  primary key (agent_a_id, agent_b_id)
);

alter table public.diplomatic_states enable row level security;
create policy "authenticated can read diplomacy" on public.diplomatic_states for select to authenticated using (true);
create policy "authenticated can upsert diplomacy" on public.diplomatic_states for all to authenticated with check (true);

create table public.research_progress (
  user_id          uuid references public.profiles(user_id) on delete cascade,
  research_id      text not null,
  energy_invested  float default 0,
  completed        boolean default false,
  primary key (user_id, research_id)
);

alter table public.research_progress enable row level security;
create policy "users can manage own research" on public.research_progress for all using (auth.uid() = user_id);
