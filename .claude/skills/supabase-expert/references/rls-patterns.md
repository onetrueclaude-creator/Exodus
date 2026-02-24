# RLS Policy Patterns — ZK Agentic Network

All tables in this project have RLS enabled. Policies follow two main patterns.

---

## Pattern 1: User-Owned Data

For tables where each row belongs to one user (`user_id uuid` column):

```sql
alter table public.my_table enable row level security;

-- Owner can read their own rows
create policy "users can read own my_table"
  on public.my_table for select
  using (auth.uid() = user_id);

-- Owner can update their own rows
create policy "users can update own my_table"
  on public.my_table for update
  using (auth.uid() = user_id);

-- Service role has full access (Python backend)
create policy "service role can write my_table"
  on public.my_table for all
  to service_role
  using (true);
```

Tables using this pattern: `profiles`, `user_resources`, `planets`, `research_progress`

---

## Pattern 2: Shared Read / Service Write

For game-state tables that all authenticated users can read but only the Python backend writes:

```sql
alter table public.my_table enable row level security;

-- All authenticated users can read
create policy "authenticated users can read my_table"
  on public.my_table for select
  to authenticated
  using (true);

-- Only service_role can write (Python backend uses SUPABASE_SERVICE_KEY)
create policy "service role can write my_table"
  on public.my_table for all
  to service_role
  using (true);
```

Tables using this pattern: `agents`, `chain_status`, `chain_messages`, `diplomatic_states`

---

## Pattern 3: Authenticated Insert with Ownership Check

For user-generated content where the user must own the referenced agent:

```sql
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
```

---

## Security Notes

1. **Never use `using (true)` without a role qualifier** — this grants anonymous access. Always add `to authenticated` or `to service_role`.

2. **`security definer` functions bypass RLS** — use for triggers (`handle_new_user`) but never expose to clients.

3. **Service role key is a full bypass** — never include `SUPABASE_SERVICE_ROLE_KEY` in client-side code or commit it. Keep in `.env.local` (gitignored) and server-only API routes.

4. **ZK planets** (`is_zero_knowledge = true`) must not be readable by other users — the policy `not is_zero_knowledge` enforces this.

5. **`haiku_messages` sender impersonation** — the insert policy checks that `sender_agent_id` belongs to the authenticated user. Without this check, any user could post as any agent.

---

## Debugging RLS

To test a policy as a specific user in the Supabase SQL editor:

```sql
-- Impersonate a user
set request.jwt.claims = '{"sub": "user-uuid-here", "role": "authenticated"}';
set role authenticated;

-- Now queries run as that user
select * from public.agents;
```

To check which policies exist:
```sql
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

---

## Dropping and Recreating Policies

When fixing a broken policy (as done in `20260223000007_security_fixes.sql`):

```sql
drop policy if exists "old policy name" on public.my_table;

create policy "new policy name"
  on public.my_table for select
  to authenticated
  using (true);
```

Always use `if exists` on drop to make migrations idempotent.
