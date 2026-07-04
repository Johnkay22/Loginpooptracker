-- Part 1: profiles + wallet user rekey (additive)

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  industry text,
  job_title text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format_check
    check (
      char_length(username) >= 3
      and char_length(username) <= 20
      and username ~ '^[a-zA-Z0-9_]+$'
    )
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on table public.profiles to authenticated;

alter table public.wallets
  add column if not exists user_id uuid unique references auth.users(id);

create index if not exists wallets_user_id_idx on public.wallets (user_id);

create or replace function public.wallet_attach_user(p_anon_id text, p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anon_wallet public.wallets%rowtype;
  v_user_wallet public.wallets%rowtype;
  v_result public.wallets%rowtype;
  v_primary_last_claim timestamptz;
  v_secondary_last_claim timestamptz;
  v_has_anon boolean := false;
  v_has_user boolean := false;
begin
  if p_anon_id is null or btrim(p_anon_id) = '' then
    raise exception 'anon_id is required';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  -- Consistent lock order: anon row first, then user row.
  select *
    into v_anon_wallet
  from public.wallets
  where anon_id = p_anon_id
  for update;
  v_has_anon := found;

  select *
    into v_user_wallet
  from public.wallets
  where user_id = p_user_id
  for update;
  v_has_user := found;

  if v_has_anon and v_has_user
     and v_anon_wallet.anon_id <> v_user_wallet.anon_id then
    v_primary_last_claim := coalesce(v_user_wallet.last_claim_at, '-infinity'::timestamptz);
    v_secondary_last_claim := coalesce(v_anon_wallet.last_claim_at, '-infinity'::timestamptz);

    update public.wallets as w
       set token_balance = v_user_wallet.token_balance + v_anon_wallet.token_balance,
           total_earned = v_user_wallet.total_earned + v_anon_wallet.total_earned,
           longest_streak = greatest(v_user_wallet.longest_streak, v_anon_wallet.longest_streak),
           current_streak = case
             when v_secondary_last_claim > v_primary_last_claim then v_anon_wallet.current_streak
             else v_user_wallet.current_streak
           end,
           last_claim_date = case
             when v_secondary_last_claim > v_primary_last_claim then v_anon_wallet.last_claim_date
             else v_user_wallet.last_claim_date
           end,
           last_claim_at = case
             when v_secondary_last_claim > v_primary_last_claim then v_anon_wallet.last_claim_at
             else v_user_wallet.last_claim_at
           end,
           window_anchor_date = case
             when v_secondary_last_claim > v_primary_last_claim then v_anon_wallet.window_anchor_date
             else v_user_wallet.window_anchor_date
           end,
           window_log_count = case
             when v_secondary_last_claim > v_primary_last_claim then v_anon_wallet.window_log_count
             else v_user_wallet.window_log_count
           end,
           goals_completed = greatest(v_user_wallet.goals_completed, v_anon_wallet.goals_completed),
           first_claim_at = least(
             coalesce(v_user_wallet.first_claim_at, v_anon_wallet.first_claim_at),
             coalesce(v_anon_wallet.first_claim_at, v_user_wallet.first_claim_at)
           )
     where w.user_id = p_user_id
     returning *
       into v_result;

    delete from public.wallets where anon_id = p_anon_id;
    return v_result;
  end if;

  if v_has_anon then
    update public.wallets as w
       set user_id = p_user_id
     where w.anon_id = p_anon_id
     returning *
       into v_result;
    return v_result;
  end if;

  if v_has_user then
    return v_user_wallet;
  end if;

  insert into public.wallets (anon_id, user_id)
  values ('user:' || p_user_id::text, p_user_id)
  returning *
    into v_result;

  return v_result;
end;
$$;

revoke all on function public.wallet_attach_user(text, uuid)
  from anon, authenticated, public;
grant execute on function public.wallet_attach_user(text, uuid)
  to service_role;

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
set search_path = public
as $$
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

  select *
    into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_wallet.last_claim_at is not null
     and (v_now - v_wallet.last_claim_at) < make_interval(hours => p_min_hours_between_claims) then
    v_status := 'backstop_blocked';
    return jsonb_build_object(
      'status', v_status,
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
    v_status := 'already_claimed_today';
    return jsonb_build_object(
      'status', v_status,
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

  if v_window_log_count = 7 then
    v_tier := 'perfect';
  elsif v_window_log_count = 6 then
    v_tier := 'overtime';
  elsif v_window_log_count = 5 then
    v_tier := 'goal';
  else
    v_tier := 'normal';
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
   returning w.token_balance
        into v_new_balance;

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
$$;

revoke all on function public.wallet_claim_user(uuid, integer, bigint, bigint, bigint, integer)
  from anon, authenticated, public;
grant execute on function public.wallet_claim_user(uuid, integer, bigint, bigint, bigint, integer)
  to service_role;
