-- Profiles: one row per signed-up user, created automatically on sign up.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  username text unique,
  role text not null default 'member' check (role in ('member', 'koach', 'prokoach')),
  bio text not null default '',
  city text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id and role in ('member', 'koach'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'koach' then 'koach' else 'member' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Public bucket for profile photos. Each user writes only inside a folder named after their id.
-- Wrapped so a permissions difference on the storage schema can't block the rest of the setup.
do $$
begin
  insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
  drop policy if exists "Users upload their own avatar" on storage.objects;
  create policy "Users upload their own avatar" on storage.objects for insert to authenticated
    with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "Users replace their own avatar" on storage.objects;
  create policy "Users replace their own avatar" on storage.objects for update to authenticated
    using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
exception when others then
  raise warning 'avatar storage setup skipped: %', sqlerrm;
end;
$$;
