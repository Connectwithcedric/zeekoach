-- Classes, like the old YouKoach app: a class is a series of sessions (same title, Koach and place,
-- repeated on several dates). Every session belongs to one; a one-off session is a class of one.
alter table public.sessions add column if not exists series_id uuid;
alter table public.sessions add column if not exists status text not null default 'scheduled';
alter table public.sessions add column if not exists cancelled_at timestamptz;
do $$ begin
  alter table public.sessions add constraint sessions_status_check check (status in ('scheduled', 'cancelled'));
exception when duplicate_object then null; end $$;
update public.sessions set series_id = id where series_id is null;
create index if not exists sessions_series on public.sessions (series_id, starts_at);

create or replace function public.sessions_default_series() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.series_id is null then new.series_id := new.id; end if;
  return new;
end; $$;
drop trigger if exists sessions_default_series on public.sessions;
create trigger sessions_default_series before insert on public.sessions for each row execute procedure public.sessions_default_series();

-- Not security definer, so current_user is whoever made the change.
create or replace function public.notify_session_cancel() returns trigger language plpgsql set search_path = '' as $$
begin
  -- Cancelling goes through the app's server, which refunds everyone first.
  if new.status is distinct from old.status and current_user in ('authenticated', 'anon') then
    raise exception 'Cancel a session from the app so bookings are refunded.';
  end if;
  return new;
end; $$;
drop trigger if exists sessions_cancel_notify on public.sessions;
create trigger sessions_cancel_notify before update on public.sessions for each row execute procedure public.notify_session_cancel();

-- Following, liking and commenting on a class.
create table if not exists public.class_follows (
  series_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (series_id, user_id)
);
create table if not exists public.class_likes (
  series_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (series_id, user_id)
);
create table if not exists public.class_comments (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.class_comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists class_comments_series on public.class_comments (series_id, created_at);
alter table public.class_follows enable row level security;
alter table public.class_likes enable row level security;
alter table public.class_comments enable row level security;
drop policy if exists "Class follows are public" on public.class_follows;
create policy "Class follows are public" on public.class_follows for select using (true);
drop policy if exists "Follow classes as yourself" on public.class_follows;
create policy "Follow classes as yourself" on public.class_follows for insert with check (auth.uid() = user_id);
drop policy if exists "Unfollow classes as yourself" on public.class_follows;
create policy "Unfollow classes as yourself" on public.class_follows for delete using (auth.uid() = user_id);
drop policy if exists "Class likes are public" on public.class_likes;
create policy "Class likes are public" on public.class_likes for select using (true);
drop policy if exists "Like classes as yourself" on public.class_likes;
create policy "Like classes as yourself" on public.class_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Unlike classes as yourself" on public.class_likes;
create policy "Unlike classes as yourself" on public.class_likes for delete using (auth.uid() = user_id);
drop policy if exists "Class comments are public" on public.class_comments;
create policy "Class comments are public" on public.class_comments for select using (true);
drop policy if exists "Comment on classes as yourself" on public.class_comments;
create policy "Comment on classes as yourself" on public.class_comments for insert with check (auth.uid() = user_id);
drop policy if exists "Delete your class comments" on public.class_comments;
create policy "Delete your class comments" on public.class_comments for delete using (auth.uid() = user_id);

-- Followers of a class hear when the Koach adds a new date.
create or replace function public.notify_class_date() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.series_id is distinct from new.id then
    insert into public.notifications (user_id, actor_id, kind, target, text)
      select f.user_id, new.koach_id, 'session', '/sessions/' || new.id, 'added a new date for “' || new.title || '”'
      from public.class_follows f where f.series_id = new.series_id and f.user_id <> new.koach_id;
  end if;
  return new;
end; $$;
drop trigger if exists sessions_class_notify on public.sessions;
create trigger sessions_class_notify after insert on public.sessions for each row execute procedure public.notify_class_date();

-- A session with paid bookings can't be deleted, only cancelled (which refunds people).
create or replace function public.sessions_no_delete_booked() returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.bookings where session_id = old.id and status = 'confirmed') and current_user in ('authenticated', 'anon') then
    raise exception 'This session has bookings. Cancel it instead, so people get their money back.';
  end if;
  return old;
end; $$;
drop trigger if exists sessions_no_delete_booked on public.sessions;
create trigger sessions_no_delete_booked before delete on public.sessions for each row execute procedure public.sessions_no_delete_booked();
