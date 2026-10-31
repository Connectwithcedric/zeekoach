-- Sign up asks what the old YouKoach app asked: birthday, gender, username and a verified phone.
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists phone_verified boolean not null default false;

-- One-time SMS codes. Only the server reads and writes this table, so it has no policies.
create table if not exists public.phone_codes (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  tries int not null default 0,
  verified_at timestamptz
);
alter table public.phone_codes enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  ref uuid := public.referrer_for(coalesce(meta ->> 'ref', ''));
  uname text := nullif(lower(meta ->> 'username'), '');
  tel text := nullif(meta ->> 'phone', '');
begin
  -- Someone may have taken the username between the check and the sign up: leave it empty then.
  if uname is not null and exists (select 1 from public.profiles where username = uname) then
    uname := null;
  end if;
  insert into public.profiles (id, name, username, role, referred_by, birthday, gender, phone, phone_verified)
  values (
    new.id,
    coalesce(meta ->> 'name', ''),
    uname,
    case when meta ->> 'role' = 'koach' then 'koach' else 'member' end,
    case when ref = new.id then null else ref end,
    case when meta ->> 'birthday' ~ '^\d{4}-\d{2}-\d{2}$' then (meta ->> 'birthday')::date end,
    nullif(meta ->> 'gender', ''),
    tel,
    tel is not null and exists (select 1 from public.phone_codes c where c.phone = tel and c.verified_at > now() - interval '1 hour')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
