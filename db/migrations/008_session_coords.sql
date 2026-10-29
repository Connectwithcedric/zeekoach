-- Where in-person sessions happen, so they show on the map.
alter table public.sessions add column if not exists lat double precision;
alter table public.sessions add column if not exists lng double precision;
