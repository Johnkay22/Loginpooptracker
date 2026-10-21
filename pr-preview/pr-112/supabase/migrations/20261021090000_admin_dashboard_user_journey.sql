-- Admin dashboard: user journey fields.
-- Additive only. Same signature, same auth gate, same existing keys.
-- Adds:
--   * registered accounts with no wallet (previously invisible on the dashboard)
--   * per-person journey fields: first/last session, active days, sessions last 7d,
--     ratings, cities, last sign-in, device + browser of latest login, last app open
--   * profile completeness (pay setup saved)
--   * per-session city, region, rating in session history
--   * totals.never_logged / totals.logged_once (registered funnel drop-off)

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

  with
  -- every wallet-backed person (registered or anon wallet)
  wallet_people as (
    select
      w.anon_id,
      w.user_id,
      p.username,
      au.email,
      p.industry,
      p.job_title,
      s.provider,
      s.signed_up_at,
      (w.user_id is not null) as registered,
      w.token_balance, w.total_earned, w.current_streak, w.longest_streak,
      w.goals_completed, w.window_log_count,
      w.created_at as first_seen,
      w.first_claim_at, w.last_claim_at
    from wallets w
    left join profiles p on p.user_id = w.user_id
    left join auth.users au on au.id = w.user_id
    left join signups_safe s on s.user_id = w.user_id
  ),
  -- registered accounts that never got a wallet (signed up, never claimed)
  account_only_people as (
    select
      null::text as anon_id,
      au.id as user_id,
      p.username,
      au.email,
      p.industry,
      p.job_title,
      s.provider,
      s.signed_up_at,
      true as registered,
      0::bigint as token_balance, 0::bigint as total_earned,
      0::bigint as current_streak, 0::bigint as longest_streak,
      0::int as goals_completed, 0::int as window_log_count,
      au.created_at as first_seen,
      null::timestamptz as first_claim_at,
      null::timestamptz as last_claim_at
    from auth.users au
    left join profiles p on p.user_id = au.id
    left join signups_safe s on s.user_id = au.id
    where not exists (select 1 from wallets w where w.user_id = au.id)
  ),
  -- guests who logged sessions but never got a wallet (local-only token model)
  guest_people as (
    select
      ps.anon_id,
      null::uuid as user_id,
      null::text as username,
      null::text as email,
      null::text as industry,
      null::text as job_title,
      null::text as provider,
      null::timestamptz as signed_up_at,
      false as registered,
      0::bigint as token_balance, 0::bigint as total_earned,
      0::bigint as current_streak, 0::bigint as longest_streak,
      0::int as goals_completed, 0::int as window_log_count,
      min(ps.created_at) as first_seen,
      null::timestamptz as first_claim_at,
      null::timestamptz as last_claim_at
    from poop_sessions ps
    where ps.user_id is null
      and ps.anon_id is not null
      and not exists (select 1 from wallets w where w.anon_id = ps.anon_id)
    group by ps.anon_id
  ),
  people as (
    select * from wallet_people
    union all
    select * from account_only_people
    union all
    select * from guest_people
  ),
  enriched as (
    select
      pe.*,
      coalesce(sess.n,0) as session_count,
      coalesce(sess.avg_s,0) as avg_session_seconds,
      coalesce(sess.total_s,0) as total_session_seconds,
      coalesce(round(sess.earn::numeric,2),0) as session_earnings,
      coalesce(sess.tp_sq,0) as tp_squares,
      coalesce(round(sess.tp_sv::numeric,2),0) as tp_savings,
      sess.last_session_at,
      sess.first_session_at,
      coalesce(sess.active_days,0) as active_days,
      coalesce(sess.n_7d,0) as sessions_7d,
      coalesce(sess.rated,0) as rated_sessions,
      sess.avg_rating,
      sess.cities,
      acct.last_sign_in_at,
      acct.email_confirmed_at,
      dev.device,
      dev.browser,
      dev.last_app_open_at,
      prof.pay_mode,
      (prof.user_id is not null) as has_profile,
      coalesce(hist.items,'[]'::jsonb) as sessions,
      greatest(
        coalesce(pe.last_claim_at, '-infinity'::timestamptz),
        coalesce(sess.last_session_at, '-infinity'::timestamptz)
      ) as last_active_at
    from people pe
    left join auth.users acct on acct.id = pe.user_id
    left join profiles prof on prof.user_id = pe.user_id
    left join lateral (
      select count(*) n, round(avg(duration_seconds)) avg_s, sum(duration_seconds) total_s,
             sum(earnings) earn, sum(tp_squares) tp_sq, sum(tp_savings) tp_sv,
             max(created_at) last_session_at,
             min(created_at) first_session_at,
             count(distinct (created_at at time zone 'America/Chicago')::date) active_days,
             count(*) filter (where created_at > now() - interval '7 days') n_7d,
             count(rating) rated,
             round(avg(rating)::numeric,1) avg_rating,
             string_agg(distinct nullif(city,''), ', ') cities
      from poop_sessions ps
      where ps.anon_id = pe.anon_id
         or (pe.user_id is not null and ps.user_id = pe.user_id)
    ) sess on true
    left join lateral (
      select
        case when x.ua is null then null
             when x.ua ~* '(iphone|ipad|ipod)' then 'iPhone'
             when x.ua ~* 'android' then 'Android'
             when x.ua ~* 'cros' then 'Chromebook'
             when x.ua ~* 'macintosh' then 'Mac'
             when x.ua ~* 'windows' then 'Windows'
             when x.ua ~* 'linux' then 'Linux'
             else 'Other' end as device,
        case when x.ua is null then null
             when x.ua ~* 'instagram' then 'Instagram in-app'
             when x.ua ~* '(fban|fbav|fb_iab)' then 'Facebook in-app'
             when x.ua ~* 'reddit' then 'Reddit in-app'
             when x.ua ~* 'edg' then 'Edge'
             when x.ua ~* '(crios|chrome)' then 'Chrome'
             when x.ua ~* '(fxios|firefox)' then 'Firefox'
             when x.ua ~* 'safari' then 'Safari'
             else 'Other' end as browser,
        x.last_open as last_app_open_at
      from (
        select ses.user_agent as ua,
               greatest(ses.updated_at, ses.created_at) as last_open
        from auth.sessions ses
        where pe.user_id is not null and ses.user_id = pe.user_id
        order by greatest(ses.updated_at, ses.created_at) desc nulls last
        limit 1
      ) x
    ) dev on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
               'at', q.created_at, 'sec', q.duration_seconds,
               'earn', round(q.earnings::numeric,2), 'tp', q.tp_squares, 'tp_save', q.tp_savings,
               'city', q.city, 'region', q.region, 'rating', q.rating
             ) order by q.created_at desc) as items
      from (
        select ps.created_at, ps.duration_seconds, ps.earnings, ps.tp_squares, ps.tp_savings,
               ps.city, ps.region, ps.rating
        from poop_sessions ps
        where ps.anon_id = pe.anon_id
           or (pe.user_id is not null and ps.user_id = pe.user_id)
        order by ps.created_at desc limit 50
      ) q
    ) hist on true
  )
  select jsonb_build_object(
    'generated_at', now(),
    'totals', (
      select jsonb_build_object(
        'total_people', count(*),
        'registered', count(*) filter (where registered),
        'guests', count(*) filter (where not registered),
        'active_7d', count(*) filter (where last_active_at > now() - interval '7 days'),
        'hit_5_days', count(*) filter (where window_log_count >= 5),
        'never_logged', count(*) filter (where registered and session_count = 0),
        'logged_once', count(*) filter (where registered and session_count = 1),
        'conversion_pct', case when count(*) = 0 then 0
          else round(100.0 * count(*) filter (where registered) / count(*), 1) end
      ) from enriched
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
        'guest_sessions', count(*) filter (where user_id is null),
        'tp_squares_total', coalesce(sum(tp_squares),0),
        'tp_savings_total', coalesce(round(sum(tp_savings)::numeric,2),0)
      ) from poop_sessions
    ),
    'signups', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'provider', provider, 'count', c) order by d),'[]'::jsonb)
      from (select signed_up_at::date as d, provider, count(*) as c from signups_safe group by 1,2) t
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.at desc),'[]'::jsonb)
      from (
        select ps.created_at as at, ps.duration_seconds as sec,
               round(ps.earnings::numeric,2) as earn, ps.tp_squares as tp,
               coalesce(p.username, ps.anon_id) as who,
               (ps.user_id is not null) as registered
        from poop_sessions ps
        left join profiles p on p.user_id = ps.user_id
        order by ps.created_at desc limit 25
      ) r
    ),
    'users', (
      select coalesce(jsonb_agg(to_jsonb(e) order by e.registered desc, e.token_balance desc, e.last_active_at desc nulls last),'[]'::jsonb)
      from enriched e
    )
  ) into result;

  return result;
end
$function$;
