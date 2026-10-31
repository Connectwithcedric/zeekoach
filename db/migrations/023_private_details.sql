-- Phone, birthday and gender were readable by anyone through the public profile.
-- They now live in a table only the person (and the server) can read. Settings for language and currency live here too.
create table if not exists public.private_details (
  -- Deferred, so the row can be written while the profile row itself is being inserted.
  user_id uuid primary key references public.profiles (id) on delete cascade deferrable initially deferred,
  birthday date,
  gender text,
  phone text,
  phone_verified boolean not null default false,
  language text not null default 'en',
  currency text not null default 'USD',
  private_account boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists private_details_phone on public.private_details (phone) where phone is not null;
alter table public.private_details enable row level security;
drop policy if exists "See your private details" on public.private_details;
create policy "See your private details" on public.private_details for select using (auth.uid() = user_id);
drop policy if exists "Change your private details" on public.private_details;
create policy "Change your private details" on public.private_details for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Add your private details" on public.private_details;
create policy "Add your private details" on public.private_details for insert with check (auth.uid() = user_id);
-- People can change these themselves; the phone (and whether it's verified) only through the server.
revoke insert, update on public.private_details from authenticated, anon;
grant insert (user_id, birthday, gender, language, currency, private_account, updated_at), update (birthday, gender, language, currency, private_account, updated_at) on public.private_details to authenticated;

insert into public.private_details (user_id, birthday, gender, phone, phone_verified)
  select id, birthday, gender, phone, phone_verified from public.profiles
  on conflict (user_id) do nothing;

-- Anything that still writes these to profiles (sign up, older screens) is moved across and cleared from the public row.
create or replace function public.profiles_keep_private() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  from_client boolean := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') in ('authenticated', 'anon');
begin
  if new.birthday is not null or new.gender is not null or new.phone is not null then
    insert into public.private_details (user_id, birthday, gender, phone, phone_verified)
      values (new.id, new.birthday, new.gender, case when from_client then null else new.phone end, not from_client and new.phone_verified)
      on conflict (user_id) do update set
        birthday = coalesce(excluded.birthday, public.private_details.birthday),
        gender = coalesce(excluded.gender, public.private_details.gender),
        phone = coalesce(excluded.phone, public.private_details.phone),
        phone_verified = case when excluded.phone is not null then excluded.phone_verified else public.private_details.phone_verified end,
        updated_at = now();
  elsif tg_op = 'INSERT' then
    insert into public.private_details (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  new.birthday := null;
  new.gender := null;
  new.phone := null;
  new.phone_verified := false;
  return new;
end; $$;
drop trigger if exists profiles_keep_private on public.profiles;
create trigger profiles_keep_private before insert or update on public.profiles for each row execute procedure public.profiles_keep_private();

update public.profiles set birthday = null, gender = null, phone = null, phone_verified = false
  where birthday is not null or gender is not null or phone is not null or phone_verified;

-- Emergency contacts, like the old app: who to call if something happens during a session.
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  relation text not null default '' check (char_length(relation) <= 40),
  phone text not null check (char_length(phone) between 5 and 30),
  created_at timestamptz not null default now()
);
alter table public.emergency_contacts enable row level security;
drop policy if exists "Manage your emergency contacts" on public.emergency_contacts;
create policy "Manage your emergency contacts" on public.emergency_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Identity verification, like the old app: upload an ID, zKoach checks it and gives the verified badge.
create table if not exists public.identity_checks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  doc_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.identity_checks enable row level security;
drop policy if exists "See your identity check" on public.identity_checks;
create policy "See your identity check" on public.identity_checks for select using (auth.uid() = user_id);
drop policy if exists "Send your ID" on public.identity_checks;
create policy "Send your ID" on public.identity_checks for insert with check (auth.uid() = user_id and status = 'pending');
drop policy if exists "Send your ID again" on public.identity_checks;
create policy "Send your ID again" on public.identity_checks for update using (auth.uid() = user_id and status <> 'approved') with check (auth.uid() = user_id and status = 'pending');
alter table public.profiles add column if not exists id_verified boolean not null default false;

do $$
begin
  -- Private bucket: only the owner (and the server) can read an ID photo.
  insert into storage.buckets (id, name, public) values ('ids', 'ids', false) on conflict (id) do nothing;
  drop policy if exists "Upload your own ID" on storage.objects;
  create policy "Upload your own ID" on storage.objects for insert to authenticated
    with check (bucket_id = 'ids' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "Read your own ID" on storage.objects;
  create policy "Read your own ID" on storage.objects for select to authenticated
    using (bucket_id = 'ids' and (storage.foldername(name))[1] = auth.uid()::text);
exception when others then
  raise warning 'ids storage setup skipped: %', sqlerrm;
end $$;

-- People choose Member or Koach themselves; ProKoach and the ID badge are only given by zKoach.
create or replace function public.profiles_guard() returns trigger language plpgsql set search_path = '' as $$
declare
  from_client boolean := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') in ('authenticated', 'anon');
begin
  if not from_client then return new; end if;
  if tg_op = 'INSERT' then
    if new.role = 'prokoach' then new.role := 'koach'; end if;
    new.id_verified := false;
  else
    if new.role is distinct from old.role and (new.role = 'prokoach' or old.role = 'prokoach') then new.role := old.role; end if;
    new.id_verified := old.id_verified;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles for each row execute procedure public.profiles_guard();
