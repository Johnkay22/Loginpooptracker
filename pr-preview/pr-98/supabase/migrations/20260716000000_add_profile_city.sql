-- Adds an optional, user-editable city to profiles. Filled in from the
-- profile-setup modal at signup or later from the header profile popup.
-- Distinct from poop_sessions.city, which is IP-derived per session.
alter table public.profiles
  add column if not exists city text;

alter table public.profiles
  drop constraint if exists profiles_city_length_check;

alter table public.profiles
  add constraint profiles_city_length_check
  check (city is null or char_length(city) <= 120);
