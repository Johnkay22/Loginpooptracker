# PoopProfit: Landing Deploy + Passwordless Auth Build

Handoff for Cursor working in the `Johnkay22/Loginpooptracker` repo. Cursor already has full Supabase MCP access and can execute SQL and deploy functions directly.

## Credentials: already handled

All credentials are already baked into the provided files. `auth.html` contains the Google Client ID, Supabase URL, and anon key in its CONFIG block, and both hero art images are inlined. Nothing to fill in. NEVER embed the service_role key in any HTML; use it only server-side via the Supabase MCP for the edge function.

## Hard constraints. Read first.

- Supabase project: **PoopProfit, project ID `ukfboxemqwuwkvfglzfq`. Use ONLY this project.**
- A second Supabase project called Ablty (`ghjajyxcjfqidcmqdzdp`) exists. **NEVER touch it. Do not list, query, or migrate it.**
- Passwordless only. No password fields anywhere. Google One Tap primary, email magic link fallback.
- No existing users worth preserving. Clean rebuilds of auth-related tables are fine. Guest wallet data may exist; the merge path below handles it.
- Run all SQL through the Supabase MCP as migrations, and save each migration file into `supabase/migrations/` so the repo stays the source of truth.
- **Games and future pages stay as separate standalone HTML files at repo root** (like the existing `TurdRaceGame.html`). Do not fold them into `core-preview.html`.

## Page model (three distinct roles, do not merge them)

1. **`index.html`** = landing. Fully OPEN, no gate. Guest timer + conversion modal. This is the funnel. (Deployed in Part 0.)
2. **`auth.html`** = NEW sign-in page. Google One Tap + magic link. This is where every "Sign Up Free" / "Log in" CTA points.
3. **`core-preview.html`** = the app. HARD GATED. On load, if no Supabase session, redirect to `/auth.html`. No session, no app.

The landing stays open on purpose (people must feel the product to convert). The app is the locked room. The auth page is the key. Keep these three responsibilities separate.

## Part 0: Deploy the new landing page (2 min, zero risk)

`index.html` in this folder is fully self-contained (all CSS, JS, and images inlined as base64, no external files needed). Replace the repo root `index.html` with it. That is the entire deployment. Do NOT touch `core-preview.html`, `CNAME`, `robots.txt`, or `sitemap.xml`.

Contains: working guest timer, stop-click conversion modal with escalating copy, locked share-card preview, GA4 (`G-R1E17DCKNC`) funnel events, CTAs to `/core-preview.html`.

**After auth is built (Part 4/5), repoint the landing CTAs from `/core-preview.html` to `/auth.html`.** Note this; it's easy to miss. The CTA hrefs live in the inlined markup (`Sign Up Free` and `Log in` links). Since the file is a single inlined artifact, ask Johnny for a fresh `index.html` with updated CTAs rather than hand-editing base64-adjacent markup, OR do a plain find/replace of `/core-preview.html` to `/auth.html` on the anchor hrefs only (leave the modal's context intact). Confirm the approach with Johnny.

## Part 1: Database migration

Current state (`supabase/migrations/`): `public.wallets` has `anon_id text primary key`, balances/streaks, RLS locked to `service_role`, and a `wallet_claim(p_anon_id, ...)` RPC. Edge function `wallet` receives `anon_id` in the body.

One new migration:

1. **Profiles table**
   - `public.profiles`: `user_id uuid primary key references auth.users(id) on delete cascade`, `username text not null`, `industry text`, `job_title text`, `created_at timestamptz default now()`.
   - Case-insensitive unique username: `create unique index profiles_username_lower_idx on public.profiles (lower(username));`
   - Username check: 3-20 chars, `^[a-zA-Z0-9_]+$`.
   - RLS on. Authenticated users may select any profile (public usernames for a future leaderboard); insert/update only their own row (`auth.uid() = user_id`).

2. **Wallet rekey, additive not destructive**
   - `alter table public.wallets add column user_id uuid unique references auth.users(id);`
   - Keep `anon_id` as PK so nothing existing breaks. Authenticated lookups key on `user_id`.

3. **Merge function** `public.wallet_attach_user(p_anon_id text, p_user_id uuid)` returns the resulting wallet row. `security definer`, execute granted to `service_role` only. Row locks (`for update`), consistent lock order:
   - If both a `user_id` wallet and a separate `anon_id` wallet exist: merge into the user wallet (`token_balance` + `total_earned` summed, `longest_streak` greatest, `current_streak`/claim dates from whichever has the latest `last_claim_at`), then delete the anon row.
   - Else if only the anon wallet exists: set its `user_id`.
   - Else: insert a fresh wallet with `user_id` and placeholder `anon_id` (`'user:' || p_user_id`).
   - A balance must never decrease from the merge.

4. **`wallet_claim_user(p_user_id uuid, ...)`**: identical streak/tier logic to `wallet_claim` but keyed on `user_id`. Do NOT modify the existing `wallet_claim` signature; the guest path still uses it.

## Part 2: Edge function (`supabase/functions/wallet/index.ts`)

- Accept optional `Authorization: Bearer <jwt>`. If present, verify with `supabase.auth.getUser(jwt)`. Never trust a client-supplied user id in the body.
- Authenticated: operate by verified `user_id` (peek/claim via `wallet_claim_user`). If the body also carries an `anon_id` on the first authenticated call, run `wallet_attach_user` first so the guest balance merges instead of vanishing.
- No JWT: existing guest behavior unchanged.
- Keep the 20-hour backstop and reward tiers exactly (1/1/1/1/2/3/5, rolling 7-day window, 5 distinct days for goal).

## Part 3: Deploy the provided auth page (auth.html)

`auth.html` is INCLUDED in this folder, fully built, configured, and self-contained (credentials and art inlined). Do not rewrite it. Copy it to the repo root. That is the whole part.

What it contains: Google One Tap plus the official Google button (nonce handled per Supabase docs), magic link flow via `signInWithOtp` with `emailRedirectTo` to `/core-preview.html`, already-signed-in redirect to the app, GA4 events (`auth_signin_start`, `auth_signin_success` by method), responsive art (portrait under 900px, landscape above).

## Part 4: Gate + wire the app (`core-preview.html`)

Additive. Do NOT remove or rewrite the existing timer, session log, stats, or wallet features.

1. Supabase JS client (`SUPABASE_URL` + `SUPABASE_ANON_KEY`).
2. **Hard gate**: on load, `getSession()`. No session -> `window.location.replace('/auth.html')`. Do this before rendering gated UI so the app never flashes for signed-out users.
3. **First-login profile setup**: if authed but no `profiles` row, block with a modal requiring username (validate format client-side; treat a unique-violation on insert as "username taken"), optional industry + job title. Insert, then continue.
4. **Guest merge**: on first authed load, read the local `anon_id` and pass it to the next wallet call so the edge function runs `wallet_attach_user`. Toast if tokens merged ("Your guest tokens came with you").
5. **Header**: show username + sign-out (`supabase.auth.signOut()` -> `/auth.html`).
6. **GA4 events**: `auth_signin_start` (method), `auth_signin_success` (method), `profile_created`, `wallet_merged` (count).

## Part 5: Repoint landing CTAs

After auth works end to end, update `index.html` CTAs from `/core-preview.html` to `/auth.html` (see Part 0 note on how). Verify a signed-out click now lands on the auth page, not the gated app.

## Acceptance checklist

- [ ] Landing `index.html` deployed, old landing replaced, `core-preview.html` untouched by Part 0
- [ ] `auth.html` exists; Google One Tap + magic link both sign a user in
- [ ] core-preview redirects a signed-out visitor to `/auth.html` (no app flash)
- [ ] New user: profile modal appears, username uniqueness enforced case-insensitively; second-device sign-in skips the modal
- [ ] Guest with a token balance signs in: balance survives, anon wallet row gone, no double-claim within 20 hours across the merge
- [ ] Landing CTAs point to `/auth.html` after Part 5
- [ ] No password UI anywhere
- [ ] Ablty project untouched (no MCP call used `ghjajyxcjfqidcmqdzdp`)
- [ ] All migrations saved to `supabase/migrations/`

## Email deliverability (follow-up, not a blocker)

Supabase's built-in email sender is rate-limited (a few per hour), fine for solo testing, will choke real traffic. Before launch, wire a real SMTP provider (Resend free tier covers early volume) in Auth > Emails. Flag this to Johnny when the build is otherwise done; don't let it block testing now.

## Working style

Pitch a short plan before executing each part. Flag anything in the live schema that contradicts this document instead of forcing it.
