-- Places that owners list (gyms, studios, parks). They show on the map and in Popular Locations.
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  address text not null default '',
  description text not null default '',
  indoor boolean not null default true,
  photo text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
alter table public.places enable row level security;
drop policy if exists "Anyone sees places" on public.places;
create policy "Anyone sees places" on public.places for select using (true);
drop policy if exists "List your place" on public.places;
create policy "List your place" on public.places for insert with check (auth.uid() = owner_id);
drop policy if exists "Edit your place" on public.places;
create policy "Edit your place" on public.places for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Remove your place" on public.places;
create policy "Remove your place" on public.places for delete using (auth.uid() = owner_id);

-- ProKoach applications. Approving one (status = 'approved', done by the team) makes the account a ProKoach.
create table if not exists public.prokoach_applications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sports text not null default '',
  experience text not null default '',
  certificates text not null default '',
  website text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now()
);
alter table public.prokoach_applications enable row level security;
drop policy if exists "See your application" on public.prokoach_applications;
create policy "See your application" on public.prokoach_applications for select using (auth.uid() = user_id);
drop policy if exists "Apply yourself" on public.prokoach_applications;
create policy "Apply yourself" on public.prokoach_applications for insert with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "Edit while pending" on public.prokoach_applications;
create policy "Edit while pending" on public.prokoach_applications for update using (auth.uid() = user_id and status = 'pending') with check (auth.uid() = user_id and status = 'pending');

create or replace function public.apply_prokoach_status() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles set role = 'prokoach' where id = new.user_id;
    perform public.notify(new.user_id, null, 'prokoach', '/me', 'You are now a ProKoach!');
  elsif new.status = 'declined' and old.status is distinct from 'declined' then
    perform public.notify(new.user_id, null, 'prokoach', '/upgrade', 'Your ProKoach application was not approved this time.');
  end if;
  return new;
end; $$;
drop trigger if exists prokoach_status on public.prokoach_applications;
create trigger prokoach_status after update on public.prokoach_applications for each row execute procedure public.apply_prokoach_status();
