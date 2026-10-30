-- What a new account fills in right after signing up: the sports they do or coach,
-- a Koach's price per hour, and whether they finished that first setup.
alter table public.profiles add column if not exists sports text[] not null default '{}';
alter table public.profiles add column if not exists hourly_rate numeric(10, 2);
alter table public.profiles add column if not exists onboarded boolean not null default false;
