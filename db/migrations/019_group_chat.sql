-- Chat like the old YouKoach app: group chats (add, remove, leave), replies, deleting your messages,
-- files, and sharing posts, sessions, classes, places and profiles into a chat.
alter table public.conversations alter column user_a drop not null;
alter table public.conversations alter column user_b drop not null;
alter table public.conversations add column if not exists is_group boolean not null default false;
alter table public.conversations add column if not exists title text not null default '';
alter table public.conversations add column if not exists created_by uuid references public.profiles (id) on delete set null;

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user on public.conversation_members (user_id);
insert into public.conversation_members (conversation_id, user_id)
  select id, user_a from public.conversations where user_a is not null
  union select id, user_b from public.conversations where user_b is not null
  on conflict do nothing;

create or replace function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members where conversation_id = cid and user_id = auth.uid());
$$;
grant execute on function public.is_member(uuid) to authenticated;

alter table public.conversation_members enable row level security;
drop policy if exists "See members of your chats" on public.conversation_members;
create policy "See members of your chats" on public.conversation_members for select using (public.is_member(conversation_id));
drop policy if exists "Update your read marker" on public.conversation_members;
create policy "Update your read marker" on public.conversation_members for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "See your conversations" on public.conversations;
create policy "See your conversations" on public.conversations for select using (public.is_member(id));

alter table public.messages add column if not exists reply_to uuid references public.messages (id) on delete set null;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists file_url text;
alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists share_type text;
alter table public.messages add column if not exists share_id text;
alter table public.messages drop constraint if exists messages_check;
do $$ begin
  alter table public.messages add constraint messages_has_content
    check (body <> '' or image_url is not null or file_url is not null or share_id is not null or deleted_at is not null);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.messages add constraint messages_share_type check (share_type is null or share_type in ('post', 'session', 'class', 'place', 'profile', 'challenge'));
exception when duplicate_object then null; end $$;

drop policy if exists "Read messages in your conversations" on public.messages;
create policy "Read messages in your conversations" on public.messages for select using (public.is_member(conversation_id));
drop policy if exists "Send messages in your conversations" on public.messages;
create policy "Send messages in your conversations" on public.messages for insert with check (auth.uid() = sender_id and public.is_member(conversation_id));
drop policy if exists "Mark messages read" on public.messages;
create policy "Mark messages read" on public.messages for update using (auth.uid() <> sender_id and public.is_member(conversation_id));
drop policy if exists "Delete your messages" on public.messages;
create policy "Delete your messages" on public.messages for update using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

-- Direct chats also get member rows.
create or replace function public.start_conversation(other uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null or other is null or other = me then
    raise exception 'Cannot start this conversation';
  end if;
  if exists (select 1 from public.blocks where (blocker_id = other and blocked_id = me) or (blocker_id = me and blocked_id = other)) then
    raise exception 'You can''t message this person.';
  end if;
  insert into public.conversations (user_a, user_b) values (least(me, other), greatest(me, other))
    on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = least(me, other) and user_b = greatest(me, other);
  insert into public.conversation_members (conversation_id, user_id) values (cid, me), (cid, other) on conflict do nothing;
  return cid;
end; $$;

create or replace function public.create_group(title text, members uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null then raise exception 'Log in first'; end if;
  if coalesce(array_length(members, 1), 0) < 1 then raise exception 'Add at least one person'; end if;
  insert into public.conversations (is_group, title, created_by) values (true, left(coalesce(nullif(trim(title), ''), 'Group'), 60), me) returning id into cid;
  insert into public.conversation_members (conversation_id, user_id)
    select cid, u from unnest(array_append(members, me)) as u
    where exists (select 1 from public.profiles p where p.id = u)
    on conflict do nothing;
  insert into public.messages (conversation_id, sender_id, body) values (cid, me, 'created the group');
  return cid;
end; $$;
grant execute on function public.create_group(text, uuid[]) to authenticated;

create or replace function public.add_group_members(cid uuid, members uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member(cid) or not (select is_group from public.conversations where id = cid) then raise exception 'Not your group'; end if;
  insert into public.conversation_members (conversation_id, user_id)
    select cid, u from unnest(members) as u where exists (select 1 from public.profiles p where p.id = u) on conflict do nothing;
  insert into public.messages (conversation_id, sender_id, body)
    select cid, auth.uid(), 'added ' || string_agg(p.name, ', ') from public.profiles p where p.id = any(members);
end; $$;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;

-- The group's creator can remove people; anyone can leave.
create or replace function public.remove_group_member(cid uuid, member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.conversations where id = cid;
  if not c.is_group then raise exception 'Not a group'; end if;
  if member <> auth.uid() and c.created_by is distinct from auth.uid() then raise exception 'Only the group''s creator can remove people'; end if;
  if not public.is_member(cid) then raise exception 'Not your group'; end if;
  insert into public.messages (conversation_id, sender_id, body)
    select cid, auth.uid(), case when member = auth.uid() then 'left the group' else 'removed ' || p.name end from public.profiles p where p.id = member;
  delete from public.conversation_members where conversation_id = cid and user_id = member;
end; $$;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- Someone who isn't the sender can only mark a message read, never change it.
create or replace function public.messages_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and auth.uid() is distinct from old.sender_id then
    if (new.body, new.image_url, new.file_url, new.share_id, new.deleted_at, new.sender_id, new.conversation_id)
       is distinct from (old.body, old.image_url, old.file_url, old.share_id, old.deleted_at, old.sender_id, old.conversation_id) then
      raise exception 'You can only mark this message read.';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard before update on public.messages for each row execute procedure public.messages_guard();

-- Members may only move their own read marker, never their membership itself.
revoke update on public.conversation_members from authenticated, anon;
grant update (last_read_at) on public.conversation_members to authenticated;
