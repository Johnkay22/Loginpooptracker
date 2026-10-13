alter table public.wallets
  add column if not exists window_anchor_date date,
  add column if not exists window_log_count integer default 0,
  add column if not exists goals_completed integer default 0,
  add column if not exists first_claim_at timestamptz;

update public.wallets
set window_log_count = 0
where window_log_count is null;

update public.wallets
set goals_completed = 0
where goals_completed is null;

alter table public.wallets
  alter column window_log_count set default 0,
  alter column goals_completed set default 0,
  alter column window_log_count set not null,
  alter column goals_completed set not null;

alter table public.wallets
  drop constraint if exists wallets_window_log_count_nonnegative,
  drop constraint if exists wallets_goals_completed_nonnegative;

alter table public.wallets
  add constraint wallets_window_log_count_nonnegative check (window_log_count >= 0),
  add constraint wallets_goals_completed_nonnegative check (goals_completed >= 0);

drop function if exists public.wallet_claim(text, integer, bigint, bigint, bigint, integer);

create or replace function public.wallet_claim(
  p_anon_id text,
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
  -- Reward map is centralized here for quick tuning.
  v_reward_total_map constant jsonb := jsonb_build_object(
    '1', 1, '2', 1, '3', 1, '4', 1, '5', 2, '6', 3, '7', 5
  );
  -- Used only when BONUS_STACKS = true.
  v_bonus_map constant jsonb := jsonb_build_object('5', 1, '6', 2, '7', 4);
  v_bonus_stacks constant boolean := false;
begin
  if p_anon_id is null or btrim(p_anon_id) = '' then
    raise exception 'anon_id is required';
  end if;

  if p_tz_offset_minutes is null or p_tz_offset_minutes < -840 or p_tz_offset_minutes > 840 then
    raise exception 'invalid tz_offset_minutes';
  end if;

  -- Keep existing server-side local-date computation.
  v_local_today := (v_now - make_interval(mins => p_tz_offset_minutes))::date;

  insert into public.wallets (anon_id)
  values (p_anon_id)
  on conflict (anon_id) do nothing;

  -- Keep row locking for atomic/concurrency-safe updates.
  select *
    into v_wallet
  from public.wallets
  where anon_id = p_anon_id
  for update;

  -- Keep 20-hour backstop exactly as before.
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

  -- Keep one-claim-per-local-day logic exactly as before.
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

  -- Worked example:
  -- User logs Wed (count 1, +1, window = Wed–Tue). Skips Thu.
  -- Logs Fri (count 2, +1), Sat (count 3, +1), Mon (count 4, +1), Tue (count 5, +2 GOAL).
  -- Window closes Tue night, goals_completed +1. Next log starts a new window at count 1.
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
   where w.anon_id = p_anon_id
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

revoke all on function public.wallet_claim(text, integer, bigint, bigint, bigint, integer)
  from anon, authenticated, public;
grant execute on function public.wallet_claim(text, integer, bigint, bigint, bigint, integer)
  to service_role;
