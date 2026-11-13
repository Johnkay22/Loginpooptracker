-- Display currency for a signed-in user's earnings (symbol and number format only,
-- no exchange-rate conversion). NULL means "not chosen yet": the app falls back to
-- the browser-detected currency. Additive and nullable, so existing rows are untouched.
alter table public.profiles
  add column if not exists currency text;

alter table public.profiles
  drop constraint if exists profiles_currency_format_check;

alter table public.profiles
  add constraint profiles_currency_format_check
  check (currency is null or currency ~ '^[A-Z]{3}$');

notify pgrst, 'reload schema';
