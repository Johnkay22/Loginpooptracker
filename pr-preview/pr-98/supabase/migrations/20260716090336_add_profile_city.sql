-- Added a user-editable city to profiles for the header profile popup.
-- Superseded the same day: the popup edits industry + job_title instead.
-- Kept so the repo matches the production migration history; see
-- 20260716092344_remove_profile_city.sql for the rollback.
alter table public.profiles
  add column if not exists city text;

alter table public.profiles
  drop constraint if exists profiles_city_length_check;

alter table public.profiles
  add constraint profiles_city_length_check
  check (city is null or char_length(city) <= 120);
