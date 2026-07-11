-- Allow signed-in (authenticated role) users to insert their own poop sessions (additive).
-- The existing "anon insert" policy only covers the anon role, so signed-in users
-- (whose requests run as the authenticated role) were blocked by RLS. This adds a
-- permissive INSERT policy for the authenticated role so both guests and registered
-- users can log a session row. No existing policies, tables, or functions are changed.

alter table public.poop_sessions enable row level security;

drop policy if exists "authenticated insert" on public.poop_sessions;

create policy "authenticated insert"
  on public.poop_sessions
  for insert
  to authenticated
  with check (true);
