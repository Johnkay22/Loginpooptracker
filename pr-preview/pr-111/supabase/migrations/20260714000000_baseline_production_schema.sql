-- =====================================================================
-- PoopProfit: BASELINE PRODUCTION SCHEMA
-- Project: ukfboxemqwuwkvfglzfq
-- Captured: 2026-07-14 (live introspection of the production database)
--
-- WHY THIS FILE EXISTS
-- The repo's migration history did not match production. An external audit
-- read the repo, saw permissive policies that do NOT exist in production,
-- and reported two false "critical" data-exposure findings. This file is the
-- source of truth. Commit it, and stop hand-editing prod without a migration.
--
-- This file is idempotent-ish and safe to run against an EMPTY project to
-- reproduce production. Do NOT run it against live prod; it is a baseline.
-- =====================================================================


-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

create table if not exists public.poop_sessions (
  id                    uuid primary key default gen_random_uuid(),
  city                  text,
  region                text,
  country               text,
  earnings              numeric not null default 0,
  duration_seconds      integer not null default 0,
  created_at            timestamptz not null default now(),
  anon_id               text,
  user_id               uuid references auth.users(id),
  tp_squares            integer,
  tp_savings            numeric,
  rating                smallint,
  hourly_wage_snapshot  numeric,
  ended_at              timestamptz,
  client_id             text,
  deleted_at            timestamptz,
  constraint poop_sessions_rating_range
    check (rating is null or (rating >= 0 and rating <= 5))
);

create table if not exists public.profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  username        text not null,
  industry        text,
  job_title       text,
  created_at      timestamptz not null default now(),
  pay_mode        text,
  annual_salary   numeric,
  hours_per_week  numeric,
  hourly_wage     numeric,
  constraint profiles_username_format_check
    check (char_length(username) >= 3
       and char_length(username) <= 20
       and username ~ '^[a-zA-Z0-9_]+$')
);

create table if not exists public.wallets (
  anon_id             text primary key,
  token_balance       bigint not null default 0,
  current_streak      bigint not null default 0,
  longest_streak      bigint not null default 0,
  total_earned        bigint not null default 0,
  last_claim_date     date,
  last_claim_at       timestamptz,
  created_at          timestamptz not null default now(),
  window_anchor_date  date,
  window_log_count    integer not null default 0,
  goals_completed     integer not null default 0,
  first_claim_at      timestamptz,
  user_id             uuid unique references auth.users(id),
  signup_bonus_granted_at timestamptz,
  constraint wallets_token_balance_nonnegative    check (token_balance >= 0),
  constraint wallets_total_earned_nonnegative     check (total_earned >= 0),
  constraint wallets_current_streak_nonnegative   check (current_streak >= 0),
  constraint wallets_longest_streak_nonnegative   check (longest_streak >= 0),
  constraint wallets_window_log_count_nonnegative check (window_log_count >= 0),
  constraint wallets_goals_completed_nonnegative  check (goals_completed >= 0)
);


-- ---------------------------------------------------------------------
-- INDEXES
-- NOTE: the two partial unique indexes below CANNOT be used as the
-- onConflict target of PostgREST .upsert(). Client-side dedupe + plain
-- insert is the required pattern. Do not "fix" this by switching to upsert.
-- ---------------------------------------------------------------------

create index        if not exists poop_sessions_anon_id_idx   on public.poop_sessions using btree (anon_id);
create index        if not exists poop_sessions_user_id_idx   on public.poop_sessions using btree (user_id);
create unique index if not exists poop_sessions_user_client_uniq
  on public.poop_sessions using btree (user_id, client_id)
  where user_id is not null and client_id is not null;
create unique index if not exists poop_sessions_anon_client_uniq
  on public.poop_sessions using btree (anon_id, client_id)
  where user_id is null and anon_id is not null and client_id is not null;
create index        if not exists poop_sessions_user_ended_idx
  on public.poop_sessions using btree (user_id, ended_at desc)
  where deleted_at is null;

create unique index if not exists profiles_username_lower_idx
  on public.profiles using btree (lower(username));

create index        if not exists wallets_user_id_idx on public.wallets using btree (user_id);


-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Guests (anon) are WRITE-ONLY on poop_sessions. There is no anon SELECT
-- policy, which is why anon inserts must never chain .select() or .single()
-- (the implicit RETURNING throws 42501).
-- ---------------------------------------------------------------------

alter table public.poop_sessions enable row level security;
alter table public.profiles      enable row level security;
alter table public.wallets       enable row level security;

drop policy if exists sessions_select_own  on public.poop_sessions;
drop policy if exists sessions_insert_own  on public.poop_sessions;
drop policy if exists sessions_update_own  on public.poop_sessions;
drop policy if exists sessions_delete_own  on public.poop_sessions;
drop policy if exists sessions_insert_guest on public.poop_sessions;

create policy sessions_select_own on public.poop_sessions
  for select to authenticated using (auth.uid() = user_id);
create policy sessions_insert_own on public.poop_sessions
  for insert to authenticated with check (auth.uid() = user_id);
create policy sessions_update_own on public.poop_sessions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sessions_delete_own on public.poop_sessions
  for delete to authenticated using (auth.uid() = user_id);
create policy sessions_insert_guest on public.poop_sessions
  for insert to anon with check (user_id is null and anon_id is not null);

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Wallets are service_role only. All wallet mutation flows through the
-- edge function, never directly from the browser.
drop policy if exists wallets_service_role_select on public.wallets;
drop policy if exists wallets_service_role_insert on public.wallets;
drop policy if exists wallets_service_role_update on public.wallets;

create policy wallets_service_role_select on public.wallets
  for select to service_role using (true);
create policy wallets_service_role_insert on public.wallets
  for insert to service_role with check (true);
create policy wallets_service_role_update on public.wallets
  for update to service_role using (true) with check (true);


-- ---------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------

-- signups_safe: SECURITY DEFINER view over auth.users. Consumed ONLY by
-- admin_dashboard_stats(). It exposes no email, but it does expose every
-- user_id and signup timestamp, so it must NEVER be granted to anon or
-- authenticated. (It was, until 2026-07-14. Fixed.)
create or replace view public.signups_safe as
  select
    id          as user_id,
    created_at  as signed_up_at,
    coalesce(raw_app_meta_data ->> 'provider', 'email') as provider
  from auth.users u;

alter view public.signups_safe owner to postgres;
revoke all on public.signups_safe from anon;
revoke all on public.signups_safe from authenticated;
revoke all on public.signups_safe from public;

-- city_leaderboard: intentionally SECURITY DEFINER (no security_invoker).
-- Under security_invoker it inherited RLS on poop_sessions, so guests saw
-- zero rows and signed-in users saw only their own sessions. It exposes only
-- aggregates (no user_id, no anon_id), so definer is the correct tradeoff.
-- This will trip the supabase security_definer_view linter. That is expected.
drop view if exists public.city_leaderboard;

create view public.city_leaderboard as
  select
    city,
    region,
    country,
    count(*)::bigint        as sessions,
    round(sum(earnings), 2) as total_earnings
  from public.poop_sessions
  where city is not null
    and deleted_at is null
  group by city, region, country
  order by round(sum(earnings), 2) desc;

alter view public.city_leaderboard owner to postgres;
revoke all    on public.city_leaderboard from anon;
revoke all    on public.city_leaderboard from authenticated;
revoke all    on public.city_leaderboard from public;
grant  select on public.city_leaderboard to anon;
grant  select on public.city_leaderboard to authenticated;


-- ---------------------------------------------------------------------
-- FUNCTIONS
-- ---------------------------------------------------------------------

-- Admin dashboard. Hard-gated to the owner's user id.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result jsonb;
begin
  if auth.uid() is distinct from 'c2fc8f44-0ba7-4120-87fb-18cac7de63b8'::uuid then
    raise exception 'not_authorized';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'totals', (
      select jsonb_build_object(
        'total_wallets', count(*),
        'registered', count(*) filter (where user_id is not null),
        'guests', count(*) filter (where user_id is null),
        'active_7d', count(*) filter (where last_claim_at > now() - interval '7 days'),
        'hit_5_days', count(*) filter (where window_log_count >= 5)
      ) from wallets
    ),
    'economy', (
      select jsonb_build_object(
        'tokens_outstanding', coalesce(sum(token_balance),0),
        'tokens_ever_earned', coalesce(sum(total_earned),0),
        'goals_completed', coalesce(sum(goals_completed),0),
        'best_streak', coalesce(max(longest_streak),0)
      ) from wallets
    ),
    'sessions', (
      select jsonb_build_object(
        'total', count(*),
        'today', count(*) filter (where created_at::date = current_date),
        'last_7d', count(*) filter (where created_at > now() - interval '7 days'),
        'avg_duration_seconds', coalesce(round(avg(duration_seconds)),0),
        'total_seconds', coalesce(sum(duration_seconds),0),
        'total_earnings', coalesce(round(sum(earnings)::numeric,2),0),
        'tp_squares_total', coalesce(sum(tp_squares),0),
        'tp_savings_total', coalesce(round(sum(tp_savings)::numeric,2),0)
      ) from poop_sessions
    ),
    'signups', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'provider', provider, 'count', c) order by d),'[]'::jsonb)
      from (
        select signed_up_at::date as d, provider, count(*) as c
        from signups_safe
        group by 1, 2
      ) t
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.at desc),'[]'::jsonb)
      from (
        select
          ps.created_at as at,
          ps.duration_seconds as sec,
          round(ps.earnings::numeric,2) as earn,
          ps.tp_squares as tp,
          coalesce(p.username, ps.anon_id) as who,
          (ps.user_id is not null) as registered
        from poop_sessions ps
        left join profiles p on p.user_id = ps.user_id
        order by ps.created_at desc
        limit 25
      ) r
    ),
    'users', (
      select coalesce(jsonb_agg(to_jsonb(u) order by u.token_balance desc),'[]'::jsonb)
      from (
        select
          w.anon_id,
          p.username,
          au.email,
          p.industry,
          p.job_title,
          s.provider,
          s.signed_up_at,
          (w.user_id is not null) as registered,
          w.token_balance,
          w.total_earned,
          w.current_streak,
          w.longest_streak,
          w.goals_completed,
          w.window_log_count,
          w.created_at as wallet_created,
          w.first_claim_at,
          w.last_claim_at,
          (w.last_claim_at > now() - interval '7 days') as active_7d,
          coalesce(sess.n,0) as session_count,
          coalesce(sess.avg_s,0) as avg_session_seconds,
          coalesce(sess.total_s,0) as total_session_seconds,
          coalesce(round(sess.earn::numeric,2),0) as session_earnings,
          coalesce(sess.tp_sq,0) as tp_squares,
          coalesce(round(sess.tp_sv::numeric,2),0) as tp_savings,
          coalesce(hist.items,'[]'::jsonb) as sessions
        from wallets w
        left join profiles p on p.user_id = w.user_id
        left join auth.users au on au.id = w.user_id
        left join signups_safe s on s.user_id = w.user_id
        left join lateral (
          select count(*) n,
                 round(avg(duration_seconds)) avg_s,
                 sum(duration_seconds) total_s,
                 sum(earnings) earn,
                 sum(tp_squares) tp_sq,
                 sum(tp_savings) tp_sv
          from poop_sessions ps
          where ps.anon_id = w.anon_id
             or (w.user_id is not null and ps.user_id = w.user_id)
        ) sess on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
                   'at', q.created_at,
                   'sec', q.duration_seconds,
                   'earn', round(q.earnings::numeric,2),
                   'tp', q.tp_squares,
                   'tp_save', q.tp_savings
                 ) order by q.created_at desc) as items
          from (
            select ps.created_at, ps.duration_seconds, ps.earnings, ps.tp_squares, ps.tp_savings
            from poop_sessions ps
            where ps.anon_id = w.anon_id
               or (w.user_id is not null and ps.user_id = w.user_id)
            order by ps.created_at desc
            limit 50
          ) q
        ) hist on true
      ) u
    )
  ) into result;

  return result;
end
$function$;

revoke all on function public.admin_dashboard_stats() from public;
revoke all on function public.admin_dashboard_stats() from anon;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_dashboard_stats() to service_role;


-- Reassigns guest sessions to a newly authenticated user. Uses auth.uid(),
-- so a caller cannot claim someone else's sessions.
create or replace function public.claim_anon_sessions(p_anon_id text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_claimed integer := 0;
begin
  if v_user is null or p_anon_id is null or p_anon_id = '' then
    return 0;
  end if;

  perform 1
  from public.poop_sessions
  where anon_id = p_anon_id and user_id is null
  for update;

  update public.poop_sessions s
     set user_id = v_user
   where s.anon_id = p_anon_id
     and s.user_id is null
     and not exists (
       select 1 from public.poop_sessions existing
       where existing.user_id = v_user
         and existing.client_id is not distinct from s.client_id
         and existing.client_id is not null
     );

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$function$;

revoke all on function public.claim_anon_sessions(text) from public;
revoke all on function public.claim_anon_sessions(text) from anon;
grant execute on function public.claim_anon_sessions(text) to authenticated;
grant execute on function public.claim_anon_sessions(text) to service_role;


-- =====================================================================
-- WALLET RPCs
-- Guest wallets were removed 2026-07-14 (token-minting exploit). Wallets are
-- signed-in users only. wallet_claim_user takes user_id as a PARAMETER with
-- no auth.uid() check; it is safe ONLY because EXECUTE is service_role-only
-- and the wallet edge function verifies the caller's JWT before passing the
-- user_id through. NEVER grant these to anon or authenticated.
-- =====================================================================

-- Authenticated wallet claim. Same window logic, keyed on user_id.
create or replace function public.wallet_claim_user(
  p_user_id uuid,
  p_tz_offset_minutes integer,
  p_normal_reward bigint default 1,
  p_day5_reward bigint default 2,
  p_day7_reward bigint default 5,
  p_min_hours_between_claims integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_wallet public.wallets%rowtype;
  v_now timestamptz := now();
  v_local_today date;
  v_window_anchor_date date;
  v_window_log_count integer;
  v_goals_completed integer;
  v_tokens_awarded bigint := 0;
  v_new_balance bigint := 0;
  v_tier text := 'normal';
  v_days_to_goal integer := 0;
  v_is_first_ever boolean := false;
  v_status text := 'claimed';
  v_reward_total_map constant jsonb := jsonb_build_object(
    '1', 1, '2', 1, '3', 1, '4', 1, '5', 2, '6', 3, '7', 5
  );
  v_bonus_map constant jsonb := jsonb_build_object('5', 1, '6', 2, '7', 4);
  v_bonus_stacks constant boolean := false;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if p_tz_offset_minutes is null or p_tz_offset_minutes < -840 or p_tz_offset_minutes > 840 then
    raise exception 'invalid tz_offset_minutes';
  end if;

  v_local_today := (v_now - make_interval(mins => p_tz_offset_minutes))::date;

  insert into public.wallets (anon_id, user_id)
  values ('user:' || p_user_id::text, p_user_id)
  on conflict (user_id) do nothing;

  select * into v_wallet from public.wallets where user_id = p_user_id for update;

  if v_wallet.last_claim_at is not null
     and (v_now - v_wallet.last_claim_at) < make_interval(hours => p_min_hours_between_claims) then
    return jsonb_build_object(
      'status', 'backstop_blocked',
      'tokens_awarded', 0,
      'new_balance', v_wallet.token_balance,
      'window_day_count', greatest(0, least(7, coalesce(v_wallet.window_log_count, 0))),
      'tier', 'normal',
      'days_to_goal', greatest(0, 5 - greatest(0, least(7, coalesce(v_wallet.window_log_count, 0)))),
      'goals_completed', coalesce(v_wallet.goals_completed, 0),
      'is_first_ever', false
    );
  end if;

  if v_wallet.last_claim_date = v_local_today then
    return jsonb_build_object(
      'status', 'already_claimed_today',
      'tokens_awarded', 0,
      'new_balance', v_wallet.token_balance,
      'window_day_count', greatest(0, least(7, coalesce(v_wallet.window_log_count, 0))),
      'tier', 'normal',
      'days_to_goal', greatest(0, 5 - greatest(0, least(7, coalesce(v_wallet.window_log_count, 0)))),
      'goals_completed', coalesce(v_wallet.goals_completed, 0),
      'is_first_ever', false
    );
  end if;

  v_window_anchor_date := v_wallet.window_anchor_date;
  v_window_log_count := coalesce(v_wallet.window_log_count, 0);
  v_goals_completed := coalesce(v_wallet.goals_completed, 0);

  if v_window_anchor_date is null or v_local_today > (v_window_anchor_date + 6) then
    if v_window_anchor_date is not null and v_window_log_count >= 5 then
      v_goals_completed := v_goals_completed + 1;
    end if;
    v_window_anchor_date := v_local_today;
    v_window_log_count := 1;
  else
    v_window_log_count := least(7, greatest(1, v_window_log_count + 1));
  end if;

  if v_bonus_stacks then
    v_tokens_awarded := p_normal_reward + coalesce((v_bonus_map ->> v_window_log_count::text)::bigint, 0);
  else
    v_tokens_awarded := coalesce((v_reward_total_map ->> v_window_log_count::text)::bigint, p_normal_reward);
  end if;

  if    v_window_log_count = 7 then v_tier := 'perfect';
  elsif v_window_log_count = 6 then v_tier := 'overtime';
  elsif v_window_log_count = 5 then v_tier := 'goal';
  else                              v_tier := 'normal';
  end if;

  v_days_to_goal := greatest(0, 5 - v_window_log_count);
  v_is_first_ever := v_wallet.first_claim_at is null;

  update public.wallets as w
     set token_balance = w.token_balance + v_tokens_awarded,
         total_earned = w.total_earned + v_tokens_awarded,
         last_claim_date = v_local_today,
         last_claim_at = v_now,
         window_anchor_date = v_window_anchor_date,
         window_log_count = v_window_log_count,
         goals_completed = v_goals_completed,
         first_claim_at = coalesce(w.first_claim_at, v_now)
   where w.user_id = p_user_id
   returning w.token_balance into v_new_balance;

  return jsonb_build_object(
    'status', v_status,
    'tokens_awarded', v_tokens_awarded,
    'new_balance', v_new_balance,
    'window_day_count', v_window_log_count,
    'tier', v_tier,
    'days_to_goal', v_days_to_goal,
    'goals_completed', v_goals_completed,
    'is_first_ever', v_is_first_ever
  );
end;
$function$;

revoke all on function public.wallet_claim_user(uuid,integer,bigint,bigint,bigint,integer) from public;
revoke all on function public.wallet_claim_user(uuid,integer,bigint,bigint,bigint,integer) from anon;
revoke all on function public.wallet_claim_user(uuid,integer,bigint,bigint,bigint,integer) from authenticated;
grant execute on function public.wallet_claim_user(uuid,integer,bigint,bigint,bigint,integer) to service_role;


-- One-time signup bonus. Fixed server-side amount, idempotent via the
-- signup_bonus_granted_at flag. Replaces the old guest-wallet merge.
create or replace function public.wallet_grant_signup_bonus(
  p_user_id uuid,
  p_bonus bigint default 3
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_wallet public.wallets%rowtype;
  v_granted boolean := false;
begin
  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  insert into public.wallets (anon_id, user_id)
  values ('user:' || p_user_id::text, p_user_id)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.signup_bonus_granted_at is null then
    update public.wallets as w
       set token_balance = w.token_balance + p_bonus,
           total_earned = w.total_earned + p_bonus,
           signup_bonus_granted_at = now()
     where w.user_id = p_user_id
     returning * into v_wallet;
    v_granted := true;
  end if;

  return jsonb_build_object(
    'bonus_granted', v_granted,
    'bonus_amount', case when v_granted then p_bonus else 0 end,
    'new_balance', v_wallet.token_balance
  );
end;
$function$;

revoke all on function public.wallet_grant_signup_bonus(uuid, bigint) from public;
revoke all on function public.wallet_grant_signup_bonus(uuid, bigint) from anon;
revoke all on function public.wallet_grant_signup_bonus(uuid, bigint) from authenticated;
grant execute on function public.wallet_grant_signup_bonus(uuid, bigint) to service_role;


-- ---------------------------------------------------------------------
-- EVENT TRIGGER: auto-enable RLS on any new table in public.
-- Not callable by any API role.
-- ---------------------------------------------------------------------

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public') then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception when others then
        raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    end if;
  end loop;
end;
$function$;

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;

-- (The event trigger object itself already exists in production. If recreating
-- from scratch:  create event trigger rls_auto_enable_trg
--                  on ddl_command_end
--                  execute function public.rls_auto_enable();)
