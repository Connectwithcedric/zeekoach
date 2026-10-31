-- Stream sessions, like the old app: a Koach streams a booked session and only the people who booked can watch.
alter table public.streams add column if not exists session_id uuid references public.sessions (id) on delete set null;
create index if not exists streams_session on public.streams (session_id) where session_id is not null;

-- Who may watch: anyone for open streams; for a session stream, the host and people with a confirmed booking.
create or replace function public.can_watch(sid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.streams s
    where s.id = sid and (
      s.session_id is null or s.host_id = auth.uid()
      or exists (select 1 from public.bookings b where b.session_id = s.session_id and b.user_id = auth.uid() and b.status = 'confirmed')
    )
  );
$$;
grant execute on function public.can_watch(uuid) to anon, authenticated;

-- Only the session's Koach can stream it.
create or replace function public.streams_check_session() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.session_id is not null and not exists (select 1 from public.sessions where id = new.session_id and koach_id = new.host_id and format = 'stream') then
    raise exception 'You can only stream your own stream sessions';
  end if;
  return new;
end; $$;
drop trigger if exists streams_check_session on public.streams;
create trigger streams_check_session before insert or update of session_id on public.streams for each row execute procedure public.streams_check_session();

-- Going live notifies followers, or for a session stream the people who booked. Settings, mutes and blocks apply.
create or replace function public.notify_stream() returns trigger language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if new.session_id is null then
    for r in select follower_id as uid from public.follows where followee_id = new.host_id loop
      perform public.notify(r.uid, new.host_id, 'live', '/live/' || new.id, 'is live: ' || left(new.title, 80));
    end loop;
  else
    for r in select user_id as uid from public.bookings where session_id = new.session_id and status = 'confirmed' loop
      perform public.notify(r.uid, new.host_id, 'live', '/live/' || new.id, 'started your stream session: ' || left(new.title, 80));
    end loop;
  end if;
  return new;
end; $$;
