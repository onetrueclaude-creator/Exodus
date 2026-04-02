---
name: supabase-expert
description: This skill should be used when working with Supabase in the ZK Agentic Network (Exodus) project — including "add a Supabase table", "write a migration", "fix a Supabase RLS policy", "add a Realtime subscription", "query Supabase from the frontend", "sync data from the Python backend to Supabase", "debug a Supabase auth error", or "update the Supabase schema". Provides project-specific Supabase expertise: schema, RLS patterns, Realtime subscriptions, and the Python→Supabase sync architecture.
priority: 55
last_read: 2026-04-01T18:36:00Z
read_count: 0
---

# Supabase Expert — ZK Agentic Network

## Project Supabase Setup

- **Project ref:** `inqwwaqiptrmpxruyczy`
- **URL:** `https://inqwwaqiptrmpxruyczy.supabase.co`
- **Auth:** Supabase Auth (Google OAuth via `@supabase/ssr`)
- **Database:** Supabase Postgres (same project)
- **Realtime:** `postgres_changes` on `agents`, `chain_status`, `haiku_messages`

### Client Files

| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser client (`createBrowserClient`) |
| `src/lib/supabase/server.ts` | Server client (`createServerClient`) |
| `src/lib/supabase/middleware.ts` | `updateSession()` — SSR cookie refresh |
| `src/lib/supabase/types.ts` | Full `Database` TypeScript types |

### Env Vars

```
NEXT_PUBLIC_SUPABASE_URL=https://inqwwaqiptrmpxruyczy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key — server/scripts only>
```

---

## Schema Overview

Nine tables in `public` schema. See `references/schema.md` for full column definitions.

| Table | Description | Realtime |
|-------|-------------|----------|
| `profiles` | User identity — extends `auth.users` | No |
| `agents` | Star nodes on the grid | ✅ Yes |
| `chain_status` | Single-row live blockchain stats | ✅ Yes |
| `user_resources` | Energy, AGNTC, secured chains per user | No |
| `planets` | Content storage orbiting agents | No |
| `haiku_messages` | NCP haiku broadcast messages | ✅ Yes |
| `chain_messages` | Direct on-chain messages (synced from Python) | No |
| `diplomatic_states` | Agent-to-agent opinion scores | No |
| `research_progress` | Per-user research investment | No |

---

## RLS Policy Pattern

All tables use RLS. Two access tiers:

1. **User-scoped** (`auth.uid() = user_id`) — `profiles`, `user_resources`, `planets`, `research_progress`
2. **Authenticated read / service_role write** — `agents`, `chain_status`, `chain_messages`, `diplomatic_states`, `haiku_messages`

When adding a new table, always follow this template:

```sql
alter table public.my_table enable row level security;

-- Authenticated users can read
create policy "authenticated users can read my_table"
  on public.my_table for select
  to authenticated
  using (true);

-- Only service_role can write (Python backend uses service key)
create policy "service role can write my_table"
  on public.my_table for all
  to service_role
  using (true);
```

For user-owned data:
```sql
create policy "users can manage own my_table"
  on public.my_table for all
  using (auth.uid() = user_id);
```

---

## Realtime Subscription Pattern

The `useGameRealtime` hook (`src/hooks/useGameRealtime.ts`) is the canonical pattern:

```ts
const channel = supabase
  .channel('channel-name')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => {
    if (payload.eventType === 'DELETE') return
    const row = payload.new as AgentRow
    // update Zustand store
    syncAgentFromChain(rowToStoreAgent(row))
  })
  .subscribe()

// Cleanup
return () => { supabase.removeChannel(channel) }
```

To add Realtime to a new table:
```sql
alter publication supabase_realtime add table public.my_table;
```

---

## Python → Supabase Sync

The Python FastAPI backend (`localhost:8080`) writes to Supabase using the **service role key**. The sync module lives at `python/supabase_sync.py`.

Pattern for syncing a new entity:

```python
from supabase import create_client
import os

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

def sync_my_entity(data: dict):
    supabase.table("my_table").upsert(data, on_conflict="id").execute()
```

Key sync functions currently in `supabase_sync.py`:
- `sync_agent(agent)` — upserts to `agents` table
- `sync_chain_status(status)` — updates the single `chain_status` row
- `sync_message(msg)` — upserts to `chain_messages`

---

## Adding a Migration

All schema changes go through numbered migration files:

```
supabase/migrations/YYYYMMDDNNNNNN_description.sql
```

Name the next migration sequentially after `20260223000007_security_fixes.sql`.

Migration file template:
```sql
-- Description of what this migration does

create table public.my_table (
  id    text primary key,
  ...
);

alter table public.my_table enable row level security;
-- RLS policies here

-- Add to Realtime if needed:
-- alter publication supabase_realtime add table public.my_table;
```

After writing the migration, regenerate TypeScript types:
```bash
npx supabase gen types typescript --project-id inqwwaqiptrmpxruyczy > src/lib/supabase/types.ts
```
Or update `src/lib/supabase/types.ts` manually following the existing pattern.

---

## Frontend Query Patterns

### Server Component (read)
```ts
import { createServerClient } from '@/lib/supabase/server'

const supabase = await createServerClient()
const { data, error } = await supabase.from('agents').select('*')
```

### Client Component / Hook (read + subscribe)
```ts
import { createBrowserClient } from '@/lib/supabase/client'

const supabase = createBrowserClient()
const { data } = await supabase.from('agents').select('*')
```

### API Route (server, write)
```ts
import { createServerClient } from '@/lib/supabase/server'

const supabase = await createServerClient()
await supabase.from('user_resources').update({ energy: newVal }).eq('user_id', userId)
```

---

## Common Gotchas

1. **`chain_status` is a singleton** — always query with `.single()`, update with `.eq('id', 1)`
2. **`agents.id` is a `text` primary key**, not UUID — format is `${userId}-homenode` or `${userId}-${coords}`
3. **Service role key must never reach the browser** — only use in API routes, Python backend, and scripts
4. **RLS blocks unauthenticated reads** — all tables require `to authenticated` on select policies
5. **`focusRequest` must be cleared** after camera moves — see `CLAUDE.md` PixiJS patterns
6. **Realtime requires `alter publication`** — just enabling RLS is not enough for live updates

---

## Additional Resources

- **`references/schema.md`** — Full column definitions for all 9 tables
- **`references/rls-patterns.md`** — Complete RLS policy patterns and security notes
- **Supabase dashboard:** `https://supabase.com/dashboard/project/inqwwaqiptrmpxruyczy`
- **Generate types:** `npx supabase gen types typescript --project-id inqwwaqiptrmpxruyczy`
