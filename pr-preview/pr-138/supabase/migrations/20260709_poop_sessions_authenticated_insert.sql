-- =====================================================================
-- SUPERSEDED BY 20260714000000_baseline_production_schema.sql
-- This migration created a poop_sessions INSERT policy using `with check (true)`,
-- which does NOT exist in production. The live database uses `sessions_insert_own`
-- (`with check (auth.uid() = user_id)`) and `sessions_insert_guest`
-- (`with check (user_id is null and anon_id is not null)`) instead.
-- Kept for history only; do not treat this file as the source of truth.
-- =====================================================================

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
