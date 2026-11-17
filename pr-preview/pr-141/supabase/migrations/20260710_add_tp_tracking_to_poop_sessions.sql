-- Add optional toilet-paper tracking columns to poop_sessions (additive, non-breaking).
-- tp_squares stores the number of company toilet-paper squares a user reports for a
-- session; tp_savings stores the unrounded USD value of those squares. Both are
-- nullable so existing rows and sessions logged without TP input remain valid, and
-- no existing policies, tables, or functions are changed.

alter table public.poop_sessions
  add column if not exists tp_squares integer,
  add column if not exists tp_savings numeric;

-- Ask PostgREST to reload its schema cache so the new columns are immediately
-- available to the anon/authenticated client inserts.
notify pgrst, 'reload schema';
