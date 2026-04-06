# Supabase Game State Layer — Implementation Plan


**Goal:** Migrate ZK Agentic Network from NextAuth + local PostgreSQL + Zustand-only persistence to a single Supabase backend serving the entire game state with Realtime push.

**Architecture:** Python FastAPI writes agent/chain data to Supabase on every `block_mined` event via `supabase-py`. The Next.js frontend subscribes to Supabase Realtime, hydrates Zustand on load, and receives live game state updates without polling. Supabase Auth replaces NextAuth + local Postgres entirely.

**Tech Stack:** `@supabase/supabase-js` v2, `@supabase/ssr`, Supabase Realtime, Supabase Auth (Google OAuth), `supabase-py` (Python service), Vitest (tests), Next.js 16 App Router.

**Design doc:** `docs/plans/2026-02-23-supabase-game-state-design.md`

**⚠️ Prerequisites before Task 1:**
1. Create a Supabase project at https://supabase.com
2. Enable Google OAuth: Supabase Dashboard → Auth → Providers → Google → enter Client ID + Secret from Google Cloud Console
3. Set Redirect URL in Google Cloud Console to: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy these values — needed in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key (never expose to browser)

---

### Task 1: Install packages + create SQL schema migrations

**Files:**
- Modify: `package.json` (add supabase deps, remove prisma/nextauth)
- Create: `supabase/migrations/20260223000001_profiles.sql`
- Create: `supabase/migrations/20260223000002_agents.sql`
- Create: `supabase/migrations/20260223000003_chain_status.sql`
- Create: `supabase/migrations/20260223000004_user_resources.sql`
- Create: `supabase/migrations/20260223000005_social_state.sql`

**Step 1: Install Supabase packages, remove Prisma + NextAuth**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm uninstall next-auth @auth/prisma-adapter @prisma/adapter-pg @prisma/client prisma pg @types/pg
```

Expected: Clean install, no errors.

**Step 2: Create `.env.local` with Supabase credentials**

Add to `.env.local` (already gitignored):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Step 3: Write profiles migration**

Create `supabase/migrations/20260223000001_profiles.sql`:
```sql
-- profiles extends auth.users (Supabase Auth manages email/OAuth)
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  subscription_tier text check (subscription_tier in ('COMMUNITY','PROFESSIONAL','MAX')),
  phantom_wallet_hash text unique,
  blockchain_token_x integer,
  blockchain_token_y integer,
  start_agent_id text,
  empire_color   integer default 9175807, -- 0x8c00ff
  max_deploy_tier text default 'haiku' check (max_deploy_tier in ('haiku','sonnet','opus')),
  created_at   timestamptz default now()
);

-- Row Level Security: users can only read/write their own profile
alter table public.profiles enable row level security;

create policy "users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Auto-create profile row on signup
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
```

**Step 4: Write agents migration**

Create `supabase/migrations/20260223000002_agents.sql`:
```sql
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

-- Public read (galaxy grid is visible to all authenticated users)
alter table public.agents enable row level security;

create policy "authenticated users can read agents"
  on public.agents for select
  to authenticated
  using (true);

-- Only service_role (Python backend) can write agents
create policy "service role can write agents"
  on public.agents for all
  to service_role
  using (true);

create index agents_user_id_idx on public.agents(user_id);
create index agents_coords_idx on public.agents(chain_x, chain_y);

-- Enable realtime
alter publication supabase_realtime add table public.agents;
```

**Step 5: Write chain_status + user_resources migrations**

Create `supabase/migrations/20260223000003_chain_status.sql`:
```sql
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

-- Seed singleton row
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
```

Create `supabase/migrations/20260223000004_user_resources.sql`:
```sql
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
```

**Step 6: Write social state migrations**

Create `supabase/migrations/20260223000005_social_state.sql`:
```sql
-- Planets (content storage per agent)
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

-- Haiku messages (network broadcasts)
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

-- Chain messages (point-to-point, from Python /api/messages)
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

-- Diplomatic states (inter-agent relationships)
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

-- Research progress
create table public.research_progress (
  user_id          uuid references public.profiles(user_id) on delete cascade,
  research_id      text not null,
  energy_invested  float default 0,
  completed        boolean default false,
  primary key (user_id, research_id)
);

alter table public.research_progress enable row level security;
create policy "users can manage own research" on public.research_progress for all using (auth.uid() = user_id);
```

**Step 7: Apply migrations to Supabase**

In Supabase Dashboard → SQL Editor, run each migration file in order (000001 → 000005).

Or with Supabase CLI:
```bash
npx supabase db push
```

**Step 8: Verify tables exist**

In Supabase Dashboard → Table Editor, confirm 8 tables exist:
`profiles`, `agents`, `chain_status`, `user_resources`, `planets`, `haiku_messages`, `chain_messages`, `diplomatic_states`, `research_progress`

**Step 9: Commit**

```bash
git add supabase/ package.json package-lock.json
git commit -m "chore: install supabase deps, add SQL schema migrations"
```

---

### Task 2: Supabase client helpers

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/lib/supabase/types.ts`
- Test: `src/__tests__/lib/supabase/client.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/lib/supabase/client.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

// Mock @supabase/supabase-js before importing
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

describe('supabase client helpers', () => {
  it('createBrowserClient returns a client object', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const { createBrowserClient } = await import('@/lib/supabase/client')
    const client = createBrowserClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/lib/supabase/client.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/supabase/client'`

**Step 3: Create browser client helper**

Create `src/lib/supabase/client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 4: Create server client helper**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createSupabaseAdminClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Step 5: Create middleware session refresher**

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST be called before any other supabase calls
  const { data: { user } } = await supabase.auth.getUser()
  return { supabaseResponse, user }
}
```

**Step 6: Create minimal TypeScript database types**

Create `src/lib/supabase/types.ts`:
```typescript
// Minimal database types — extend as tables are used
// Full types can be generated: npx supabase gen types typescript --project-id <ref>

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          username: string | null
          subscription_tier: 'COMMUNITY' | 'PROFESSIONAL' | 'MAX' | null
          phantom_wallet_hash: string | null
          blockchain_token_x: number | null
          blockchain_token_y: number | null
          start_agent_id: string | null
          empire_color: number
          max_deploy_tier: 'haiku' | 'sonnet' | 'opus'
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      agents: {
        Row: {
          id: string
          user_id: string | null
          chain_x: number
          chain_y: number
          visual_x: number
          visual_y: number
          tier: 'haiku' | 'sonnet' | 'opus'
          is_primary: boolean
          username: string | null
          bio: string | null
          intro_message: string | null
          density: number
          storage_slots: number
          stake: number
          border_radius: number
          mining_rate: number
          cpu_per_turn: number
          staked_cpu: number
          parent_agent_id: string | null
          synced_at: string
        }
        Insert: Partial<Database['public']['Tables']['agents']['Row']> & { id: string; chain_x: number; chain_y: number; visual_x: number; visual_y: number }
        Update: Partial<Database['public']['Tables']['agents']['Row']>
      }
      chain_status: {
        Row: {
          id: number
          state_root: string
          blocks_processed: number
          total_claims: number
          community_pool_remaining: number
          total_mined: number
          next_block_in: number
          synced_at: string
        }
        Insert: Partial<Database['public']['Tables']['chain_status']['Row']>
        Update: Partial<Database['public']['Tables']['chain_status']['Row']>
      }
      user_resources: {
        Row: {
          user_id: string
          energy: number
          minerals: number
          agntc_balance: number
          secured_chains: number
          turn: number
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['user_resources']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['user_resources']['Row']>
      }
      planets: {
        Row: { id: string; agent_id: string | null; user_id: string; content: string; content_type: string; is_zero_knowledge: boolean; created_at: string }
        Insert: Omit<Database['public']['Tables']['planets']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['planets']['Row']>
      }
      haiku_messages: {
        Row: { id: string; sender_agent_id: string | null; text: string; syllables: number[]; position_x: number; position_y: number; timestamp: number }
        Insert: Database['public']['Tables']['haiku_messages']['Row']
        Update: Partial<Database['public']['Tables']['haiku_messages']['Row']>
      }
      chain_messages: {
        Row: { id: string; sender_chain_x: number; sender_chain_y: number; target_chain_x: number; target_chain_y: number; text: string; timestamp: number }
        Insert: Database['public']['Tables']['chain_messages']['Row']
        Update: Partial<Database['public']['Tables']['chain_messages']['Row']>
      }
      diplomatic_states: {
        Row: { agent_a_id: string; agent_b_id: string; exchange_count: number; opinion: number; clarity_level: number; last_exchange: number | null }
        Insert: Partial<Database['public']['Tables']['diplomatic_states']['Row']> & { agent_a_id: string; agent_b_id: string }
        Update: Partial<Database['public']['Tables']['diplomatic_states']['Row']>
      }
      research_progress: {
        Row: { user_id: string; research_id: string; energy_invested: number; completed: boolean }
        Insert: Database['public']['Tables']['research_progress']['Row']
        Update: Partial<Database['public']['Tables']['research_progress']['Row']>
      }
    }
  }
}
```

**Step 7: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/lib/supabase/client.test.ts
```

Expected: PASS

**Step 8: Commit**

```bash
git add src/lib/supabase/ src/__tests__/lib/supabase/
git commit -m "feat(supabase): add client/server/middleware helpers + DB types"
```

---

### Task 3: Replace Next.js middleware + auth layer

**Files:**
- Rewrite: `src/middleware.ts`
- Rewrite: `src/lib/auth.ts` → becomes thin Supabase auth wrapper
- Delete: `src/lib/auth.config.ts`
- Delete: `src/lib/prisma.ts`
- Delete: `src/app/api/auth/[...nextauth]/route.ts`
- Test: `src/__tests__/middleware.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/middleware.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async (req) => ({
    supabaseResponse: { cookies: { set: vi.fn() } },
    user: null,
  })),
}))

describe('middleware', () => {
  it('redirects unauthenticated user from /game to /', async () => {
    const { default: middleware } = await import('@/middleware')
    const req = new NextRequest('http://localhost:3000/game')
    const res = await middleware(req)
    expect(res?.headers.get('location')).toContain('/')
  })

  it('allows unauthenticated user to access /', async () => {
    const { default: middleware } = await import('@/middleware')
    const req = new NextRequest('http://localhost:3000/')
    const res = await middleware(req)
    // No redirect for landing page when unauthenticated
    expect(res?.headers.get('location')).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/middleware.test.ts
```

Expected: FAIL — NextAuth imports break in test environment

**Step 3: Rewrite `src/middleware.ts`**

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  // DEV BYPASS
  if (process.env.NODE_ENV === 'development') {
    return supabaseResponse
  }

  // Always allow: auth callbacks, static, public API
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return supabaseResponse
  }

  // Landing page: authenticated users skip to game flow
  if (pathname === '/') {
    if (user) return NextResponse.redirect(new URL('/game', request.url))
    return supabaseResponse
  }

  // All other routes require auth
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Check onboarding completeness
  if (pathname === '/game' || pathname === '/onboard' || pathname === '/subscribe') {
    try {
      const statusRes = await fetch(new URL('/api/user/status', request.url), {
        headers: { cookie: request.headers.get('cookie') || '' },
      })
      if (statusRes.ok) {
        const profile = await statusRes.json()
        if (!profile.username && pathname !== '/onboard') {
          return NextResponse.redirect(new URL('/onboard', request.url))
        }
        if (profile.username && !profile.subscription_tier && pathname !== '/subscribe') {
          return NextResponse.redirect(new URL('/subscribe', request.url))
        }
        if (profile.username && profile.subscription_tier && pathname !== '/game') {
          return NextResponse.redirect(new URL('/game', request.url))
        }
      }
    } catch {}
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 4: Create thin auth helper**

Rewrite `src/lib/auth.ts` (replaces NextAuth setup):
```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Get the authenticated user from the Supabase session. Returns null if not authenticated. */
export async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}
```

**Step 5: Delete dead files**

```bash
git rm src/lib/auth.config.ts src/lib/prisma.ts
git rm -r src/app/api/auth/
```

**Step 6: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/middleware.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/middleware.ts src/lib/auth.ts
git commit -m "feat(auth): replace NextAuth with Supabase Auth + @supabase/ssr middleware"
```

---

### Task 4: Add Google OAuth login route + profile auto-create

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/login/route.ts`
- Modify: `src/app/page.tsx` (replace NextAuth signIn button)
- Test: `src/__tests__/app/auth/callback.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/app/auth/callback.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: vi.fn(async () => ({ error: null })) }
  }))
}))

describe('auth callback route', () => {
  it('redirects to /game on success', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const req = new Request('http://localhost:3000/auth/callback?code=abc123')
    const res = await GET(req)
    expect(res.headers.get('location')).toContain('/game')
  })

  it('redirects to / on missing code', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const req = new Request('http://localhost:3000/auth/callback')
    const res = await GET(req)
    expect(res.headers.get('location')).toContain('/?error=auth_error')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/app/auth/callback.test.ts
```

Expected: FAIL — route file doesn't exist

**Step 3: Create OAuth callback route**

Create `src/app/auth/callback/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?error=auth_error', request.url))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/?error=auth_error', request.url))
  }

  return NextResponse.redirect(new URL('/game', request.url))
}
```

**Step 4: Create login trigger route**

Create `src/app/auth/login/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const redirectUrl = new URL('/auth/callback', request.url).toString()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  })

  if (error || !data.url) {
    return NextResponse.redirect(new URL('/?error=auth_error', request.url))
  }

  return NextResponse.redirect(data.url)
}
```

**Step 5: Update landing page sign-in button**

In `src/app/page.tsx`, replace the NextAuth `signIn('google')` call with:
```tsx
// Replace any NextAuth signIn button with:
<a href="/auth/login">
  <button>Sign in with Google</button>
</a>
```

Find the existing sign-in button and update accordingly. Do not change any other UI.

**Step 6: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/app/auth/callback.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/app/auth/ src/app/page.tsx
git commit -m "feat(auth): add Google OAuth callback + login routes via Supabase Auth"
```

---

### Task 5: Migrate API routes to Supabase

**Files:**
- Rewrite: `src/app/api/user/route.ts`
- Rewrite: `src/app/api/user/status/route.ts`
- Rewrite: `src/app/api/subscribe/route.ts`
- Test: `src/__tests__/api/user.test.ts`
- Test: `src/__tests__/api/subscribe.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/api/user.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockSupabase = {
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'uid-1' } } })) },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { username: 'testuser' }, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
    })),
  })),
}

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => mockSupabase),
}))

describe('GET /api/user — username availability', () => {
  it('returns available: true for unused username', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })
    const { GET } = await import('@/app/api/user/route')
    const req = new Request('http://localhost/api/user?username=newuser')
    const res = await GET(req)
    const body = await res.json()
    expect(body.available).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/api/user.test.ts
```

Expected: FAIL — imports Prisma

**Step 3: Rewrite `src/app/api/user/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')?.trim()

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false, error: 'Invalid format' })
  }

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}

export async function PATCH(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const username = (body.username as string)?.trim()

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: 'Username must be 3-20 characters (letters, numbers, underscore)' },
      { status: 400 }
    )
  }

  const supabase = await createSupabaseServerClient()

  const { data: existing } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ username })
}
```

**Step 4: Rewrite `src/app/api/user/status/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createSupabaseServerClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username, subscription_tier, blockchain_token_x, blockchain_token_y, start_agent_id, empire_color, max_deploy_tier')
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(profile)
}
```

**Step 5: Rewrite `src/app/api/subscribe/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '@/types/subscription'
import { CHAIN_GRID_MIN, CHAIN_GRID_MAX } from '@/types/testnet'

const TESTNET_API = process.env.NEXT_PUBLIC_TESTNET_API ?? 'http://localhost:8080'

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const tier = body.tier as SubscriptionTier
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier)
  if (!plan) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })

  const supabase = await createSupabaseServerClient()

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('user_id', user.id)
    .single()

  if (existing?.subscription_tier) {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 409 })
  }

  // Assign deterministic grid coordinate
  const hash = simpleHash(user.id)
  const gridRange = CHAIN_GRID_MAX - CHAIN_GRID_MIN + 1
  const coordX = CHAIN_GRID_MIN + (hash % gridRange)
  const coordY = CHAIN_GRID_MIN + ((hash * 2654435761) % gridRange)
  const startAgentId = `agent-${user.id.slice(0, 8)}-${Date.now().toString(36)}`

  // Register on testnet (non-fatal)
  try {
    await fetch(`${TESTNET_API}/api/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_index: 0, x: coordX, y: coordY, stake: 200 }),
    })
  } catch (err) {
    console.error('Testnet unreachable:', err)
  }

  // Update profile
  await supabase.from('profiles').update({
    subscription_tier: tier,
    blockchain_token_x: coordX,
    blockchain_token_y: coordY,
    start_agent_id: startAgentId,
    max_deploy_tier: plan.maxAgentTier,
  }).eq('user_id', user.id)

  // Create initial user_resources row
  await supabase.from('user_resources').insert({
    user_id: user.id,
    energy: plan.startEnergy,
    minerals: plan.startMinerals,
    agntc_balance: plan.startAgntc,
    secured_chains: 0,
    turn: 0,
  })

  return NextResponse.json({
    subscription: tier,
    blockchainToken: { x: coordX, y: coordY },
    startAgentId,
    startEnergy: plan.startEnergy,
    startAgntc: plan.startAgntc,
    startMinerals: plan.startMinerals,
    startAgent: plan.startAgent,
  })
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
```

**Step 6: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/api/user.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/app/api/user/ src/app/api/subscribe/
git commit -m "feat(api): migrate user + subscribe routes from Prisma to Supabase"
```

---

### Task 6: Python supabase-py integration

> **Note:** The Python FastAPI service is a **separate external service**, not in this repository. Apply these changes to that service. The typical location is a separate directory or repo (e.g. `agentic-chain/`).

**Files (in Python service):**
- Modify: `requirements.txt` — add `supabase`
- Modify: `main.py` (or wherever `block_mined` is broadcast and `/api/nodes` is served)

**Step 1: Install supabase-py**

```bash
pip install supabase
# or add to requirements.txt: supabase>=2.0.0
```

**Step 2: Add Supabase env vars to Python service**

In `.env` (Python service):
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Step 3: Add Supabase client + chain-to-visual helper to main.py**

```python
import os
from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CHAIN_MIN = -3240
CHAIN_MAX = 3240
VISUAL_MIN = -4000
VISUAL_MAX = 4000

def chain_to_visual(chain_x: int, chain_y: int) -> tuple[float, float]:
    """Map blockchain coords to PixiJS visual coords."""
    vx = ((chain_x - CHAIN_MIN) / (CHAIN_MAX - CHAIN_MIN)) * (VISUAL_MAX - VISUAL_MIN) + VISUAL_MIN
    vy = ((chain_y - CHAIN_MIN) / (CHAIN_MAX - CHAIN_MIN)) * (VISUAL_MAX - VISUAL_MIN) + VISUAL_MIN
    return vx, vy

def stake_to_tier(stake: int) -> str:
    if stake >= 80: return "opus"
    if stake >= 30: return "sonnet"
    return "haiku"

TIER_BORDER = {"haiku": 60, "sonnet": 90, "opus": 130}
TIER_MINING = {"haiku": 2, "sonnet": 5, "opus": 12}
TIER_CPU = {"haiku": 1, "sonnet": 3, "opus": 8}
```

**Step 4: Wire block_mined → Supabase upsert**

Find the function that fires on `block_mined` (likely in the WebSocket broadcast or mine endpoint). Add after it:

```python
def sync_to_supabase(genesis_state) -> None:
    """Push current chain state to Supabase after each block."""
    try:
        # Upsert all claimed agents
        claims = []
        for (x, y), claim in genesis_state.claims.items():
            tier = stake_to_tier(claim.stake)
            vx, vy = chain_to_visual(x, y)
            # Determine index for this owner (first = primary)
            owner_claims = [c for c in genesis_state.claims.values() if c.owner == claim.owner]
            idx = list(genesis_state.claims.keys()).index((x, y))
            owner_idx = next(i for i, c in enumerate(owner_claims) if c.owner == claim.owner and genesis_state.claims.get((x, y)) == c)
            claims.append({
                "id": f"chain-{claim.owner[:8]}-{idx}",
                "user_id": None,  # Resolved by Next.js from phantom_wallet_hash
                "chain_x": x,
                "chain_y": y,
                "visual_x": vx,
                "visual_y": vy,
                "tier": tier,
                "is_primary": owner_idx == 0,
                "density": claim.density,
                "storage_slots": claim.storage_slots,
                "stake": claim.stake,
                "border_radius": float(TIER_BORDER[tier]),
                "mining_rate": claim.density * TIER_MINING[tier],
                "cpu_per_turn": TIER_CPU[tier],
                "staked_cpu": 0,
            })

        if claims:
            supabase.table("agents").upsert(claims, on_conflict="id").execute()

        # Upsert chain_status singleton
        supabase.table("chain_status").upsert({
            "id": 1,
            "state_root": genesis_state.state_root,
            "blocks_processed": genesis_state.block_number,
            "total_claims": len(genesis_state.claims),
            "community_pool_remaining": int(genesis_state.community_pool_remaining),
            "total_mined": int(genesis_state.total_mined),
            "next_block_in": 60.0,
        }, on_conflict="id").execute()

    except Exception as e:
        print(f"[supabase sync error] {e}")
```

Call `sync_to_supabase(genesis_state)` at the end of your `mine_block()` or `process_block()` function.

**Step 5: Seed unclaimed nodes on startup**

Find the startup/lifespan function. After initializing `genesis_state`, add:

```python
async def seed_unclaimed_nodes():
    """Seed deterministic unclaimed node slots into Supabase once on startup."""
    nodes = genesis_state.get_nodes(count=200, seed=42)  # adjust to your API
    rows = []
    for node in nodes:
        vx, vy = chain_to_visual(node.x, node.y)
        rows.append({
            "id": f"node-{node.id}",
            "user_id": None,
            "chain_x": node.x,
            "chain_y": node.y,
            "visual_x": vx,
            "visual_y": vy,
            "tier": "haiku",
            "is_primary": False,
            "density": node.density,
            "storage_slots": node.storage_slots,
            "stake": 0,
            "border_radius": 30.0,
            "mining_rate": 0.0,
            "cpu_per_turn": 0,
            "staked_cpu": 0,
        })
    supabase.table("agents").upsert(rows, on_conflict="id").execute()
    print(f"[supabase] seeded {len(rows)} unclaimed node slots")
```

**Step 6: Verify in Supabase Dashboard**

Start the Python service, let one block mine. In Supabase → Table Editor → `agents`: confirm rows appear. In `chain_status`: confirm `blocks_processed` increments.

---

### Task 7: `useGameRealtime` hook (replaces `useChainWebSocket`)

**Files:**
- Create: `src/hooks/useGameRealtime.ts`
- Delete: `src/hooks/useChainWebSocket.ts` (after this task)
- Test: `src/__tests__/hooks/useGameRealtime.test.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/hooks/useGameRealtime.test.tsx`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => ({ data: { blocks_processed: 5, state_root: 'abc', community_pool_remaining: 100, total_mined: 50, next_block_in: 45 }, error: null })),
      data: [], error: null,
    })),
  })),
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => mockSupabase),
}))

const mockSetChainStatus = vi.fn()
const mockSyncAgentFromChain = vi.fn()

vi.mock('@/store/gameStore', () => ({
  useGameStore: vi.fn((selector) => selector({
    setChainStatus: mockSetChainStatus,
    syncAgentFromChain: mockSyncAgentFromChain,
  })),
}))

describe('useGameRealtime', () => {
  beforeEach(() => vi.clearAllMocks())

  it('subscribes to chain_status and agents channels on mount', async () => {
    const { useGameRealtime } = await import('@/hooks/useGameRealtime')
    renderHook(() => useGameRealtime())
    expect(mockSupabase.channel).toHaveBeenCalledWith('game-state')
    expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ table: 'chain_status' }), expect.any(Function))
    expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ table: 'agents' }), expect.any(Function))
  })

  it('calls setChainStatus on initial chain_status fetch', async () => {
    const { useGameRealtime } = await import('@/hooks/useGameRealtime')
    const { result } = renderHook(() => useGameRealtime())
    // Allow async effects
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(mockSetChainStatus).toHaveBeenCalled()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/hooks/useGameRealtime.test.tsx
```

Expected: FAIL — hook file doesn't exist

**Step 3: Create `src/hooks/useGameRealtime.ts`**

```typescript
'use client'

import { useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useGameStore } from '@/store/gameStore'
import type { Database } from '@/lib/supabase/types'
import { TIER_BASE_BORDER, TIER_CPU_COST, TIER_MINING_RATE } from '@/types/agent'

type AgentRow = Database['public']['Tables']['agents']['Row']
type ChainStatusRow = Database['public']['Tables']['chain_status']['Row']

function rowToStoreAgent(row: AgentRow) {
  const tier = row.tier as 'haiku' | 'sonnet' | 'opus'
  return {
    id: row.id,
    userId: row.user_id ?? '',
    position: { x: row.visual_x, y: row.visual_y },
    tier,
    isPrimary: row.is_primary,
    planets: [],
    createdAt: new Date(row.synced_at).getTime(),
    username: row.username ?? undefined,
    bio: row.bio ?? undefined,
    introMessage: row.intro_message ?? undefined,
    borderRadius: row.border_radius,
    borderPressure: 0,
    cpuPerTurn: row.cpu_per_turn,
    miningRate: row.mining_rate,
    energyLimit: 100,
    stakedCpu: row.staked_cpu,
    parentAgentId: row.parent_agent_id ?? undefined,
    density: row.density,
    storageSlots: row.storage_slots,
  }
}

export function useGameRealtime() {
  const setChainStatus = useGameStore(s => s.setChainStatus)
  const syncAgentFromChain = useGameStore(s => s.syncAgentFromChain)

  useEffect(() => {
    const supabase = createBrowserClient()

    // Initial hydration
    async function hydrate() {
      const [{ data: chainStatus }, { data: agents }] = await Promise.all([
        supabase.from('chain_status').select('*').single(),
        supabase.from('agents').select('*'),
      ])

      if (chainStatus) {
        setChainStatus({
          poolRemaining: chainStatus.community_pool_remaining,
          totalMined: chainStatus.total_mined,
          stateRoot: chainStatus.state_root,
          nextBlockIn: chainStatus.next_block_in,
          blocks: chainStatus.blocks_processed,
        })
      }

      if (agents) {
        agents.forEach(row => syncAgentFromChain(rowToStoreAgent(row)))
      }
    }

    hydrate()

    // Realtime subscriptions
    const channel = supabase
      .channel('game-state')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chain_status' },
        (payload) => {
          const row = payload.new as ChainStatusRow
          setChainStatus({
            poolRemaining: row.community_pool_remaining,
            totalMined: row.total_mined,
            stateRoot: row.state_root,
            nextBlockIn: row.next_block_in,
            blocks: row.blocks_processed,
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          const row = payload.new as AgentRow
          syncAgentFromChain(rowToStoreAgent(row))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [setChainStatus, syncAgentFromChain])
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/hooks/useGameRealtime.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useGameRealtime.ts src/__tests__/hooks/useGameRealtime.test.tsx
git commit -m "feat(realtime): add useGameRealtime hook — replaces useChainWebSocket"
```

---

### Task 8: Migrate `game/page.tsx` — hydrate from Supabase, remove polling

**Files:**
- Modify: `src/app/game/page.tsx`
- Test: `src/__tests__/app/game/page.test.tsx` (if it exists — update sync logic test)

**Step 1: Find the 60s polling interval in game/page.tsx**

```bash
grep -n "syncFromChain\|setInterval\|useChainWebSocket" src/app/game/page.tsx
```

**Step 2: Remove `useChainWebSocket` import + call**

In `src/app/game/page.tsx`:
- Remove: `import { useChainWebSocket } from '@/hooks/useChainWebSocket'`
- Remove: the `useChainWebSocket()` call
- Add: `import { useGameRealtime } from '@/hooks/useGameRealtime'`
- Add: `useGameRealtime()` call in the component body

**Step 3: Remove the 60s polling `useEffect`**

Find the `useEffect` that calls `syncFromChain()` on a 60s interval. It looks like:
```typescript
useEffect(() => {
  const interval = setInterval(() => syncFromChain(), 60000)
  // ...
  return () => clearInterval(interval)
}, [...])
```

Delete this entire `useEffect`. The Realtime hook replaces it.

**Step 4: Update initial hydration — read from Supabase profile**

Find where `game/page.tsx` fetches `/api/user/status` on mount (the initial load that sets `maxDeployTier`, `empireColor`, etc). This call is fine to keep — it reads from the Supabase `profiles` table now (updated in Task 5). No change needed here.

**Step 5: Delete `useChainWebSocket.ts`**

```bash
git rm src/hooks/useChainWebSocket.ts
```

**Step 6: Run tests**

```bash
npm run test:run
```

Expected: All PASS (no new failures)

**Step 7: Commit**

```bash
git add src/app/game/page.tsx
git commit -m "feat(game): replace polling with useGameRealtime — remove 60s sync interval"
```

---

### Task 9: Persist user resources on game actions

**Files:**
- Modify: `src/store/gameStore.ts` — add Supabase persist calls on `addSecuredChain`, `spendEnergy`
- Create: `src/lib/persistResources.ts` — helper to write `user_resources` to Supabase
- Test: `src/__tests__/lib/persistResources.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/lib/persistResources.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockUpsert = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({ upsert: mockUpsert })),
  })),
}))

describe('persistResources', () => {
  it('calls supabase upsert with correct table and data', async () => {
    const { persistResources } = await import('@/lib/persistResources')
    await persistResources('user-1', { energy: 500, minerals: 30, agntc_balance: 45, secured_chains: 2, turn: 10 })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', energy: 500 }),
      { onConflict: 'user_id' }
    )
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/lib/persistResources.test.ts
```

Expected: FAIL

**Step 3: Create `src/lib/persistResources.ts`**

```typescript
import { createBrowserClient } from '@/lib/supabase/client'

interface ResourceSnapshot {
  energy: number
  minerals: number
  agntc_balance: number
  secured_chains: number
  turn: number
}

/** Persist user resource balances to Supabase after meaningful game events. */
export async function persistResources(userId: string, resources: ResourceSnapshot): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase
    .from('user_resources')
    .upsert({ user_id: userId, ...resources, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

  if (error) {
    console.warn('[persistResources] failed:', error.message)
    // Non-fatal — Zustand state is already updated, retry on next action
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/lib/persistResources.test.ts
```

Expected: PASS

**Step 5: Call `persistResources` from game actions in `game/page.tsx`**

In `src/app/game/page.tsx`, find the `handleQuickAction` or secure/mine handlers. After calls to `spendEnergy()` and `addSecuredChain()`, add:

```typescript
// After spendEnergy + addSecuredChain:
const state = useGameStore.getState()
if (state.currentUserId) {
  persistResources(state.currentUserId, {
    energy: state.energy,
    minerals: state.minerals,
    agntc_balance: state.agntcBalance,
    secured_chains: state.securedChains,
    turn: state.turn,
  })
}
```

Import `persistResources` at the top: `import { persistResources } from '@/lib/persistResources'`

**Step 6: Commit**

```bash
git add src/lib/persistResources.ts src/__tests__/lib/persistResources.test.ts src/app/game/page.tsx
git commit -m "feat(resources): persist user_resources to Supabase on game actions"
```

---

### Task 10: Persist social state (planets + haiku messages)

**Files:**
- Modify: `src/store/gameStore.ts` — `addPlanet` and `addHaiku` call Supabase
- Modify: `src/app/game/page.tsx` — hydrate planets + haiku from Supabase on load
- Test: `src/__tests__/store/socialPersist.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/store/socialPersist.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

const mockInsert = vi.fn(async () => ({ error: null }))
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}))

describe('social state persistence', () => {
  it('inserts planet to Supabase when addPlanet is called', async () => {
    const { persistPlanet } = await import('@/lib/persistSocial')
    await persistPlanet({ id: 'p1', agentId: 'a1', userId: 'u1', content: 'test', contentType: 'post', isZeroKnowledge: false, createdAt: Date.now() })
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/store/socialPersist.test.ts
```

Expected: FAIL

**Step 3: Create `src/lib/persistSocial.ts`**

```typescript
import { createBrowserClient } from '@/lib/supabase/client'
import type { Planet, HaikuMessage } from '@/types/agent'

export async function persistPlanet(planet: Planet): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('planets').insert({
    id: planet.id,
    agent_id: planet.agentId,
    user_id: planet.userId,  // must be set before calling
    content: planet.content,
    content_type: planet.contentType,
    is_zero_knowledge: planet.isZeroKnowledge,
  })
  if (error) console.warn('[persistPlanet] failed:', error.message)
}

export async function persistHaiku(haiku: HaikuMessage): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('haiku_messages').insert({
    id: haiku.id,
    sender_agent_id: haiku.senderAgentId,
    text: haiku.text,
    syllables: haiku.syllables,
    position_x: haiku.position.x,
    position_y: haiku.position.y,
    timestamp: haiku.timestamp,
  })
  if (error) console.warn('[persistHaiku] failed:', error.message)
}
```

**Step 4: Hydrate planets + haiku on game load**

In `src/app/game/page.tsx`, in the initial hydration `useEffect` (after user profile load), add:

```typescript
// Hydrate planets
const supabase = createBrowserClient()
const { data: planets } = await supabase
  .from('planets')
  .select('*')
  .eq('user_id', userId)

planets?.forEach(p => addPlanet({
  id: p.id,
  agentId: p.agent_id ?? '',
  userId: p.user_id,
  content: p.content,
  contentType: p.content_type as Planet['contentType'],
  isZeroKnowledge: p.is_zero_knowledge,
  createdAt: new Date(p.created_at).getTime(),
}))

// Hydrate haiku (last 50)
const { data: haikus } = await supabase
  .from('haiku_messages')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(50)

haikus?.forEach(h => addHaiku({
  id: h.id,
  senderAgentId: h.sender_agent_id ?? '',
  text: h.text,
  syllables: h.syllables as [number, number, number],
  position: { x: h.position_x, y: h.position_y },
  timestamp: h.timestamp,
}))
```

**Step 5: Call persist helpers from store actions**

In `src/store/gameStore.ts`, find `addPlanet` and `addHaiku` actions. After updating Zustand state, call the persist helpers (import lazily to avoid circular deps):

```typescript
// In addPlanet:
addPlanet: (planet) => {
  set(state => ({ planets: { ...state.planets, [planet.id]: planet } }))
  import('@/lib/persistSocial').then(({ persistPlanet }) => persistPlanet(planet))
},

// In addHaiku:
addHaiku: (haiku) => {
  set(state => ({ haiku: [...state.haiku, haiku] }))
  import('@/lib/persistSocial').then(({ persistHaiku }) => persistHaiku(haiku))
},
```

**Step 6: Run tests to verify they pass**

```bash
npm run test:run -- src/__tests__/store/socialPersist.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/lib/persistSocial.ts src/__tests__/store/socialPersist.test.ts src/store/gameStore.ts src/app/game/page.tsx
git commit -m "feat(social): persist planets + haiku to Supabase, hydrate on load"
```

---

### Task 11: Cleanup — remove Prisma, Docker, NextAuth

**Files:**
- Delete: `prisma/` directory
- Delete: `docker-compose.yml` (if present)
- Modify: `package.json` (verify deps removed in Task 1)
- Modify: `src/app/api/debug-log/route.ts` (remove any Prisma imports)
- Modify: `src/app/api/waitlist/route.ts` (remove any Prisma imports)

**Step 1: Scan for remaining Prisma/NextAuth imports**

```bash
grep -r "from '@prisma\|from 'next-auth\|from '@auth\|from '@/lib/prisma\|from '@/lib/auth.config" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: No output. If any files appear, update them to use Supabase equivalents before deleting.

**Step 2: Remove Prisma directory**

```bash
git rm -r prisma/
```

**Step 3: Remove docker-compose if present**

```bash
ls docker-compose.yml 2>/dev/null && git rm docker-compose.yml || echo "no docker-compose"
```

**Step 4: Remove dead auth files**

```bash
git rm src/lib/auth.config.ts src/lib/prisma.ts 2>/dev/null || echo "already removed"
```

**Step 5: Run full test suite**

```bash
npm run test:run
```

Expected: ALL PASS. If failures appear, fix them before committing.

**Step 6: Run build to check for type errors**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

**Step 7: Final commit**

```bash
git add -A
git commit -m "chore: remove Prisma, NextAuth, docker-compose — Supabase migration complete"
```

---

## Verification Checklist

After all 11 tasks complete, verify end-to-end:

```
1. npm run build                  → exit 0
2. npm run test:run               → all PASS
3. Start Python service           → blocks mining, Supabase agents table populates
4. npm run dev                    → localhost:3000
5. Sign in with Google            → Supabase Auth callback works
6. /onboard → set username        → profiles.username updated
7. /subscribe → choose tier       → profiles.subscription_tier + user_resources created
8. /game loads                    → agents hydrated from Supabase, ResourceBar shows balances
9. Supabase Dashboard Realtime    → watch agents table, Python writes appear
10. Browser: Secure action        → user_resources.secured_chains increments in DB
11. Browser reload /game          → all state restored from Supabase (nothing lost)
```
