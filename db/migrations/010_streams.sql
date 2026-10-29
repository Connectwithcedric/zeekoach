-- Live streams. Video goes browser to browser (WebRTC); this table only says who is live.
create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  seen_at timestamptz not null default now() -- the host's browser refreshes this while live
);
create index if not exists streams_live on public.streams (started_at desc) where ended_at is null;
alter table public.streams enable row level security;
drop policy if exists "Anyone sees streams" on public.streams;
create policy "Anyone sees streams" on public.streams for select using (true);
drop policy if exists "Go live yourself" on public.streams;
create policy "Go live yourself" on public.streams for insert with check (auth.uid() = host_id);
drop policy if exists "End your stream" on public.streams;
create policy "End your stream" on public.streams for update using (auth.uid() = host_id) with check (auth.uid() = host_id);

-- Followers hear when someone goes live.
create or replace function public.notify_stream() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, target, text)
  select f.follower_id, new.host_id, 'live', '/live/' || new.id, 'is live: ' || left(new.title, 80)
  from public.follows f where f.followee_id = new.host_id;
  return new;
end; $$;
drop trigger if exists streams_notify on public.streams;
create trigger streams_notify after insert on public.streams for each row execute procedure public.notify_stream();

do $$
begin
  alter publication supabase_realtime add table public.streams;
exception when others then null;
end $$;
