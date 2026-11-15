-- Poop Profit: Overtime, survival leaderboard (game Build 23).
--
-- One row per signed-in player: their best "Survival of the Shittest" time.
-- Nothing existing is changed. The game never reads or writes this table directly:
--   overtime_start_run()   signed-in only. Marks the moment a survival run starts.
--   overtime_submit_run()  signed-in only. Posts a finished run; only a new personal best changes the board.
--   overtime_leaderboard() anyone. Returns the top times with usernames, plus the caller's own row.
-- Cheat checks are basic on purpose: a time can never be longer than the real time that passed since the
-- run was started on the server, and the run's other numbers must be possible. A score can be hidden by
-- setting hidden = true.

create table if not exists public.overtime_survival_scores (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  best_seconds           numeric(7,1) check (best_seconds is null or (best_seconds > 0 and best_seconds <= 10800)),
  kills                  integer,
  level                  integer,
  bosses                 integer,
  build                  integer,
  achieved_at            timestamptz,
  runs_posted            integer not null default 0,
  current_run_id         uuid,
  current_run_started_at timestamptz,
  hidden                 boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.overtime_survival_scores is
  'Overtime survival leaderboard: one row per signed-in player (best time). Access only through the overtime_* functions.';

-- Locked down: no policies, so the browser cannot read or write rows directly.
alter table public.overtime_survival_scores enable row level security;
revoke all on table public.overtime_survival_scores from anon, authenticated;

create index if not exists overtime_survival_scores_board_idx
  on public.overtime_survival_scores (best_seconds desc, achieved_at asc)
  where best_seconds is not null and not hidden;

-- 1. A survival run starts. Returns a one-time run id the game hands back when the run ends.
create or replace function public.overtime_start_run()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_run  uuid := gen_random_uuid();
begin
  if v_user is null then
    raise exception 'Sign in to post a time.' using errcode = '28000';
  end if;
  insert into public.overtime_survival_scores (user_id, current_run_id, current_run_started_at)
  values (v_user, v_run, now())
  on conflict (user_id) do update
    set current_run_id = excluded.current_run_id,
        current_run_started_at = excluded.current_run_started_at,
        updated_at = now();
  return v_run;
end;
$$;

-- 2. A survival run ends. The board only changes when the time beats the player's best.
create or replace function public.overtime_submit_run(
  p_run     uuid,
  p_seconds numeric,
  p_kills   integer,
  p_level   integer,
  p_bosses  integer,
  p_build   integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user    uuid := auth.uid();
  v_row     public.overtime_survival_scores%rowtype;
  v_secs    numeric := round(p_seconds, 1);
  v_elapsed numeric;
  v_best    numeric;
  v_posted  boolean := false;
  v_rank    bigint;
begin
  if v_user is null then
    raise exception 'Sign in to post a time.' using errcode = '28000';
  end if;

  select * into v_row from public.overtime_survival_scores where user_id = v_user for update;
  if not found or v_row.current_run_id is null or p_run is null or v_row.current_run_id <> p_run then
    return jsonb_build_object('posted', false, 'reason', 'unknown_run');
  end if;

  v_elapsed := extract(epoch from (now() - v_row.current_run_started_at));

  -- A run id works once.
  update public.overtime_survival_scores
     set current_run_id = null, current_run_started_at = null, updated_at = now()
   where user_id = v_user;

  -- The game clock stops while paused or choosing an upgrade, so it can never run ahead of real time.
  -- 20 seconds of slack covers a slow connection when the run started.
  if v_secs is null or v_secs < 1 or v_secs > 10800 or v_secs > v_elapsed + 20
     or p_kills is null or p_kills < 0 or p_kills > v_secs * 25 + 100
     or p_level is null or p_level < 1 or p_level > 300
     or p_bosses is null or p_bosses < 0 or p_bosses > floor(v_secs / 180)
  then
    return jsonb_build_object('posted', false, 'reason', 'rejected');
  end if;

  if v_row.best_seconds is null or v_secs > v_row.best_seconds then
    update public.overtime_survival_scores
       set best_seconds = v_secs, kills = p_kills, level = p_level, bosses = p_bosses, build = p_build,
           achieved_at = now(), runs_posted = runs_posted + 1, updated_at = now()
     where user_id = v_user;
    v_posted := true;
  end if;

  v_best := greatest(v_secs, coalesce(v_row.best_seconds, 0));
  if not v_row.hidden then
    select count(*) + 1 into v_rank
      from public.overtime_survival_scores s
     where s.best_seconds is not null and not s.hidden and s.best_seconds > v_best;
  end if;

  return jsonb_build_object('posted', v_posted, 'reason', case when v_posted then null else 'not_a_best' end,
                            'best', v_best, 'rank', v_rank);
end;
$$;

-- 3. The board: the top times, plus the caller's own row when they are signed in and outside the top.
create or replace function public.overtime_leaderboard(p_limit integer default 10)
returns table (place bigint, username text, best_seconds numeric, is_me boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ranked as (
    select s.user_id, s.best_seconds,
           rank()       over (order by s.best_seconds desc)                     as place,
           row_number() over (order by s.best_seconds desc, s.achieved_at asc)  as pos
      from public.overtime_survival_scores s
     where s.best_seconds is not null and not s.hidden
  )
  select r.place,
         coalesce(p.username, 'Employee ' || upper(substr(md5(r.user_id::text), 1, 4))) as username,
         r.best_seconds,
         coalesce(r.user_id = auth.uid(), false) as is_me
    from ranked r
    left join public.profiles p on p.user_id = r.user_id
   where r.pos <= least(greatest(coalesce(p_limit, 10), 1), 50)
      or r.user_id = auth.uid()
   order by r.pos;
$$;

-- Who may call what. New functions are callable by everyone by default, so take that away first.
revoke all on function public.overtime_start_run() from public, anon;
revoke all on function public.overtime_submit_run(uuid, numeric, integer, integer, integer, integer) from public, anon;
revoke all on function public.overtime_leaderboard(integer) from public;
grant execute on function public.overtime_start_run() to authenticated;
grant execute on function public.overtime_submit_run(uuid, numeric, integer, integer, integer, integer) to authenticated;
grant execute on function public.overtime_leaderboard(integer) to anon, authenticated;

notify pgrst, 'reload schema';
