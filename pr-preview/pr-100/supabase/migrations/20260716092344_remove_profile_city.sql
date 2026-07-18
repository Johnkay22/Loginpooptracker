-- Rolls back add_profile_city: the profile popup uses industry + job_title
-- instead, so the never-used profiles.city column is removed.
alter table public.profiles
  drop constraint if exists profiles_city_length_check;

alter table public.profiles
  drop column if exists city;
