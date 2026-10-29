-- Share & Earn: who referred whom, plus link views and shares for the stats.
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;

create table if not exists public.referral_events (
  id bigint generated always as identity primary key,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('view', 'share')),
  created_at timestamptz not null default now()
);
create index if not exists referral_events_referrer on public.referral_events (referrer_id, created_at);
alter table public.referral_events enable row level security;
drop policy if exists "See your own referral events" on public.referral_events;
create policy "See your own referral events" on public.referral_events for select using (auth.uid() = referrer_id);

-- A referral code is a username or a profile id.
create or replace function public.referrer_for(code text)
returns uuid
language sql
stable
security definer set search_path = ''
as $$
  select id from public.profiles
  where username = lower(code) or id::text = code
  limit 1;
$$;

create or replace function public.track_referral(code text, kind text)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  rid uuid := public.referrer_for(code);
begin
  if rid is not null and kind in ('view', 'share') then
    insert into public.referral_events (referrer_id, kind) values (rid, kind);
  end if;
end;
$$;
grant execute on function public.track_referral(text, text) to anon, authenticated;

-- New accounts remember who referred them (the "ref" sign-up field).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  ref uuid := public.referrer_for(coalesce(new.raw_user_meta_data ->> 'ref', ''));
begin
  insert into public.profiles (id, name, role, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'koach' then 'koach' else 'member' end,
    case when ref = new.id then null else ref end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Your Share & Earn numbers since a date. Commission: 20% of the ZeeKoach service fee on bookings
-- by people you referred directly, 10% for people they referred. Fees on sessions that haven't
-- happened yet are held back.
create or replace function public.referral_stats(since timestamptz default '-infinity', until timestamptz default 'infinity')
returns json
language sql
stable
security definer set search_path = ''
as $$
  with me as (select auth.uid() as id),
  direct as (select p.id, p.name, p.created_at from public.profiles p, me where p.referred_by = me.id),
  indirect as (select p.id, p.name, p.created_at from public.profiles p join direct d on p.referred_by = d.id),
  refs as (
    select id, name, created_at, 'Direct' as type, 0.2 as rate from direct
    union all select id, name, created_at, 'Indirect', 0.1 from indirect
  ),
  fees as (
    select r.id as user_id, r.rate, b.total / 1.32 * 0.1 as fee, s.ends_at < now() as settled
    from refs r
    join public.bookings b on b.user_id = r.id and b.status = 'confirmed' and b.created_at >= since and b.created_at < until
    join public.sessions s on s.id = b.session_id
  )
  select json_build_object(
    'shares', (select count(*) from public.referral_events e, me where e.referrer_id = me.id and e.kind = 'share' and e.created_at >= since and e.created_at < until),
    'views', (select count(*) from public.referral_events e, me where e.referrer_id = me.id and e.kind = 'view' and e.created_at >= since and e.created_at < until),
    'signups', (select count(*) from refs where created_at >= since and created_at < until),
    'conversions', (select count(distinct user_id) from fees),
    'earnings', (select coalesce(round(sum(fee * rate) filter (where settled), 2), 0) from fees),
    'holdback', (select coalesce(round(sum(fee * rate) filter (where not settled), 2), 0) from fees),
    'referrals', (select coalesce(json_agg(json_build_object('id', id, 'type', type, 'converted', id in (select user_id from fees)) order by created_at desc), '[]') from refs)
  );
$$;
grant execute on function public.referral_stats(timestamptz, timestamptz) to authenticated;
