-- Notification settings: which kinds you don't want. Muted and blocked people never notify you.
create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  off text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "See your notification settings" on public.notification_prefs;
create policy "See your notification settings" on public.notification_prefs for select using (auth.uid() = user_id);
drop policy if exists "Save your notification settings" on public.notification_prefs;
create policy "Save your notification settings" on public.notification_prefs for insert with check (auth.uid() = user_id);
drop policy if exists "Change your notification settings" on public.notification_prefs;
create policy "Change your notification settings" on public.notification_prefs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.notify(recipient uuid, actor uuid, kind text, target text, body text)
returns void
language sql
security definer set search_path = ''
as $$
  insert into public.notifications (user_id, actor_id, kind, target, text)
  select recipient, actor, kind, target, body
  where recipient is not null and recipient is distinct from actor
    and not exists (select 1 from public.notification_prefs p where p.user_id = recipient and kind = any (p.off))
    and (actor is null or not exists (select 1 from public.mutes m where m.muter_id = recipient and m.muted_id = actor))
    and (actor is null or not exists (select 1 from public.blocks b where (b.blocker_id = recipient and b.blocked_id = actor) or (b.blocker_id = actor and b.blocked_id = recipient)));
$$;
revoke execute on function public.notify(uuid, uuid, text, text, text) from public, anon, authenticated;

-- Clear old ones you've read.
drop policy if exists "Delete your notifications" on public.notifications;
create policy "Delete your notifications" on public.notifications for delete using (auth.uid() = user_id);
