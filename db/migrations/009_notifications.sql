-- Notifications for the bell: follows, bookings, likes, comments and challenges.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  kind text not null,
  target text not null default '',
  text text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "See your notifications" on public.notifications;
create policy "See your notifications" on public.notifications for select using (auth.uid() = user_id);
drop policy if exists "Mark your notifications read" on public.notifications;
create policy "Mark your notifications read" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.notify(recipient uuid, actor uuid, kind text, target text, body text)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.notifications (user_id, actor_id, kind, target, text)
  select recipient, actor, kind, target, body
  where recipient is not null and recipient is distinct from actor;
$$;
revoke execute on function public.notify(uuid, uuid, text, text, text) from public, anon, authenticated;

create or replace function public.notify_follow() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.followee_id, new.follower_id, 'follow', '/profile/' || new.follower_id, 'started following you');
  return new;
end; $$;
drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows for each row execute procedure public.notify_follow();

create or replace function public.notify_booking() returns trigger language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if new.status <> 'confirmed' or (tg_op = 'UPDATE' and old.status = 'confirmed') then return new; end if;
  select koach_id, title into s from public.sessions where id = new.session_id;
  perform public.notify(s.koach_id, new.user_id, 'booking', '/sessions/' || new.session_id, 'booked “' || s.title || '”');
  return new;
end; $$;
drop trigger if exists bookings_notify on public.bookings;
create trigger bookings_notify after insert or update on public.bookings for each row execute procedure public.notify_booking();

create or replace function public.notify_like() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), new.user_id, 'like', '/post/' || new.post_id, 'liked your post');
  return new;
end; $$;
drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify after insert on public.post_likes for each row execute procedure public.notify_like();

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), new.user_id, 'comment', '/post/' || new.post_id, 'commented: ' || left(new.body, 80));
  return new;
end; $$;
drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify after insert on public.post_comments for each row execute procedure public.notify_comment();

create or replace function public.notify_challenge() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.opponent_id, new.challenger_id, 'challenge', '/challenges', 'challenged you: ' || new.rule);
  elsif new.status = 'live' and old.status = 'pending' then
    perform public.notify(new.challenger_id, new.opponent_id, 'challenge', '/challenges', 'accepted your challenge');
  elsif new.status = 'declined' and old.status = 'pending' then
    perform public.notify(new.challenger_id, new.opponent_id, 'challenge', '/challenges', 'declined your challenge');
  end if;
  return new;
end; $$;
drop trigger if exists challenges_notify on public.challenges;
create trigger challenges_notify after insert or update on public.challenges for each row execute procedure public.notify_challenge();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when others then
  raise warning 'realtime for notifications skipped: %', sqlerrm;
end;
$$;
