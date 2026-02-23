-- Fix 1: restrict planet reads to authenticated users only (no anon access)
drop policy if exists "public can read non-zk planets" on public.planets;
create policy "authenticated can read non-zk planets"
  on public.planets for select
  to authenticated
  using (not is_zero_knowledge);

-- Fix 2: restrict diplomatic_states writes to service_role only
drop policy if exists "authenticated can upsert diplomacy" on public.diplomatic_states;
create policy "service role can write diplomacy"
  on public.diplomatic_states for all
  to service_role
  using (true);

-- Fix 3: prevent haiku sender impersonation
drop policy if exists "authenticated can insert haiku" on public.haiku_messages;
create policy "authenticated can insert own haiku"
  on public.haiku_messages for insert
  to authenticated
  with check (
    sender_agent_id is null
    or exists (
      select 1 from public.agents
      where id = sender_agent_id and user_id = auth.uid()
    )
  );
