create or replace function public.wallet_claim(
  p_anon_id text,
  p_tz_offset_minutes integer,
  p_normal_reward bigint default 1,
  p_day5_reward bigint default 2,
  p_day7_reward bigint default 5,
  p_min_hours_between_claims integer default 20
)
returns table (
  token_balance bigint,
  current_streak bigint,
  longest_streak bigint,
  total_earned bigint,
  last_claim_date date,
  last_claim_at timestamptz,
  awarded bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets%rowtype;
  v_now timestamptz := now();
  v_local_today date;
  v_new_streak bigint;
  v_new_longest bigint;
  v_cycle_day integer;
  v_reward bigint := 0;
begin
  if p_anon_id is null or btrim(p_anon_id) = '' then
    raise exception 'anon_id is required';
  end if;

  if p_tz_offset_minutes is null or p_tz_offset_minutes < -840 or p_tz_offset_minutes > 840 then
    raise exception 'invalid tz_offset_minutes';
  end if;

  v_local_today := (v_now - make_interval(mins => p_tz_offset_minutes))::date;

  insert into public.wallets (anon_id)
  values (p_anon_id)
  on conflict (anon_id) do nothing;

  select *
    into v_wallet
  from public.wallets
  where anon_id = p_anon_id
  for update;

  if v_wallet.last_claim_at is not null
     and (v_now - v_wallet.last_claim_at) < make_interval(hours => p_min_hours_between_claims) then
    return query
    select v_wallet.token_balance, v_wallet.current_streak, v_wallet.longest_streak,
           v_wallet.total_earned, v_wallet.last_claim_date, v_wallet.last_claim_at, 0::bigint;
    return;
  end if;

  if v_wallet.last_claim_date = v_local_today then
    return query
    select v_wallet.token_balance, v_wallet.current_streak, v_wallet.longest_streak,
           v_wallet.total_earned, v_wallet.last_claim_date, v_wallet.last_claim_at, 0::bigint;
    return;
  end if;

  if v_wallet.last_claim_date = (v_local_today - 1) then
    v_new_streak := v_wallet.current_streak + 1;
  else
    v_new_streak := 1;
  end if;

  v_cycle_day := ((v_new_streak - 1) % 7) + 1;
  if v_cycle_day = 7 then
    v_reward := p_day7_reward;
  elsif v_cycle_day = 5 then
    v_reward := p_day5_reward;
  else
    v_reward := p_normal_reward;
  end if;

  v_new_longest := greatest(v_wallet.longest_streak, v_new_streak);

  update public.wallets as w
     set token_balance   = w.token_balance + v_reward,
         total_earned    = w.total_earned + v_reward,
         current_streak  = v_new_streak,
         longest_streak  = v_new_longest,
         last_claim_date = v_local_today,
         last_claim_at   = v_now
   where w.anon_id = p_anon_id
   returning w.token_balance, w.current_streak, w.longest_streak,
             w.total_earned, w.last_claim_date, w.last_claim_at
        into token_balance, current_streak, longest_streak, total_earned, last_claim_date, last_claim_at;

  awarded := v_reward;
  return next;
end;
$$;

revoke all on function public.wallet_claim(text, integer, bigint, bigint, bigint, integer)
  from anon, authenticated, public;
grant execute on function public.wallet_claim(text, integer, bigint, bigint, bigint, integer)
  to service_role;
