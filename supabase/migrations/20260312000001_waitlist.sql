-- Waitlist table for testnet signup via Google OAuth
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar_url text,
  newsletter_consent boolean default false,
  status text default 'pending' check (status in ('pending', 'invited', 'joined')),
  signed_up_at timestamptz default now(),
  invited_at timestamptz,
  joined_at timestamptz
);

-- RLS: only service_role and the user's own row
alter table public.waitlist enable row level security;

-- Authenticated users can insert their own entry
create policy "authenticated can insert waitlist"
  on public.waitlist for insert
  to authenticated
  with check (email = (select auth.jwt() ->> 'email'));

-- Authenticated users can read their own entry (to show "already registered")
create policy "authenticated can read own waitlist"
  on public.waitlist for select
  to authenticated
  using (email = (select auth.jwt() ->> 'email'));

-- Service role has full access (for admin/invite management)
create policy "service role full access"
  on public.waitlist for all
  to service_role
  using (true);
