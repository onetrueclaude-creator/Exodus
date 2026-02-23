create table public.chain_status (
  id                        integer primary key default 1,
  state_root                text default '',
  blocks_processed          integer default 0,
  total_claims              integer default 0,
  community_pool_remaining  integer default 0,
  total_mined               integer default 0,
  next_block_in             float default 60,
  synced_at                 timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into public.chain_status (id) values (1);

alter table public.chain_status enable row level security;

create policy "authenticated users can read chain_status"
  on public.chain_status for select
  to authenticated
  using (true);

create policy "service role can write chain_status"
  on public.chain_status for all
  to service_role
  using (true);

alter publication supabase_realtime add table public.chain_status;
