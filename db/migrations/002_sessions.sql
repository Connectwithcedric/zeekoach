-- Sessions that Koaches create, and the bookings members make for them.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  koach_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null default '',
  equipment text not null default '',
  format text not null default 'in-person' check (format in ('in-person', 'stream')),
  pricing text not null default 'per-person' check (pricing in ('per-person', 'private')),
  price numeric(8, 2) not null default 0 check (price >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  age_min int not null default 0,
  indoor boolean not null default true,
  capacity int not null default 10 check (capacity > 0),
  booked int not null default 0,
  image text not null default 'gym',
  location_name text not null default '',
  address text not null default '',
  meet_up text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists sessions_starts_at on public.sessions (starts_at);
alter table public.sessions enable row level security;

drop policy if exists "Sessions are public" on public.sessions;
create policy "Sessions are public" on public.sessions for select using (true);

drop policy if exists "Koaches manage their own sessions" on public.sessions;
create policy "Koaches manage their own sessions" on public.sessions for all
  using (auth.uid() = koach_id)
  with check (
    auth.uid() = koach_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('koach', 'prokoach'))
  );

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  guests int not null default 1 check (guests between 1 and 20),
  total numeric(8, 2) not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

alter table public.bookings enable row level security;

drop policy if exists "See your bookings and bookings for your sessions" on public.bookings;
create policy "See your bookings and bookings for your sessions" on public.bookings for select using (
  auth.uid() = user_id or exists (select 1 from public.sessions s where s.id = session_id and s.koach_id = auth.uid())
);

drop policy if exists "Book for yourself" on public.bookings;
create policy "Book for yourself" on public.bookings for insert with check (auth.uid() = user_id);

drop policy if exists "Cancel your own booking" on public.bookings;
create policy "Cancel your own booking" on public.bookings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep sessions.booked in step with confirmed bookings, and refuse bookings past capacity.
create or replace function public.sync_session_booked()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  sid uuid := coalesce(new.session_id, old.session_id);
  total int;
  cap int;
begin
  select coalesce(sum(guests), 0) into total from public.bookings where session_id = sid and status = 'confirmed';
  select capacity into cap from public.sessions where id = sid;
  if total > cap then
    raise exception 'This session is full';
  end if;
  update public.sessions set booked = total where id = sid;
  return null;
end;
$$;

drop trigger if exists bookings_sync_booked on public.bookings;
create trigger bookings_sync_booked
  after insert or update or delete on public.bookings
  for each row execute procedure public.sync_session_booked();

-- Follows between real accounts.
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

drop policy if exists "Follows are public" on public.follows;
create policy "Follows are public" on public.follows for select using (true);

drop policy if exists "Follow as yourself" on public.follows;
create policy "Follow as yourself" on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "Unfollow as yourself" on public.follows;
create policy "Unfollow as yourself" on public.follows for delete using (auth.uid() = follower_id);
