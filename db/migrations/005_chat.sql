-- One-to-one chat between accounts.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
alter table public.conversations enable row level security;
drop policy if exists "See your conversations" on public.conversations;
create policy "See your conversations" on public.conversations for select using (auth.uid() in (user_a, user_b));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 4000),
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (body <> '' or image_url is not null)
);
create index if not exists messages_conversation on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;

drop policy if exists "Read messages in your conversations" on public.messages;
create policy "Read messages in your conversations" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
);
drop policy if exists "Send messages in your conversations" on public.messages;
create policy "Send messages in your conversations" on public.messages for insert with check (
  auth.uid() = sender_id
  and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
);
-- The recipient marks messages as read (read_at is the only thing that changes).
drop policy if exists "Mark messages read" on public.messages;
create policy "Mark messages read" on public.messages for update using (
  auth.uid() <> sender_id
  and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.user_a, c.user_b))
);

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.conversations set last_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
  for each row execute procedure public.touch_conversation();

-- Finds or starts the conversation between you and someone else.
create or replace function public.start_conversation(other uuid)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null or other is null or other = me then
    raise exception 'Cannot start this conversation';
  end if;
  insert into public.conversations (user_a, user_b) values (least(me, other), greatest(me, other))
    on conflict (user_a, user_b) do nothing;
  select id into cid from public.conversations where user_a = least(me, other) and user_b = greatest(me, other);
  return cid;
end;
$$;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Live updates for new messages.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when others then
  raise warning 'realtime for messages skipped: %', sqlerrm;
end;
$$;
