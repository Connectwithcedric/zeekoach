-- Admin, plans, subscriptions and coupons, like the old app's admin panel.
create table if not exists public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "Admins see themselves" on public.admins;
create policy "Admins see themselves" on public.admins for select using (auth.uid() = user_id);

-- Cedric's account is the first admin, if it exists. More admins are added from the admin page.
insert into public.admins (user_id)
  select id from auth.users where lower(email) = 'winwinfixllc@gmail.com'
  on conflict do nothing;

-- Koach plans: monthly subscriptions the admin sets up. Members can read active ones.
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  description text not null default '' check (char_length(description) <= 300),
  features text[] not null default '{}',
  price numeric(10, 2) not null check (price >= 0),
  interval text not null default 'month' check (interval in ('month', 'year')),
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;
drop policy if exists "Active plans are public" on public.plans;
create policy "Active plans are public" on public.plans for select using (active);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  stripe_subscription_id text unique,
  status text not null default 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  coupon text,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "See your subscription" on public.subscriptions;
create policy "See your subscription" on public.subscriptions for select using (auth.uid() = user_id);

create table if not exists public.coupons (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,30}$'),
  percent_off int not null check (percent_off between 1 and 100),
  months int not null default 1 check (months between 1 and 36),
  max_uses int,
  uses int not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  stripe_coupon_id text,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;
-- No client policies: coupons are checked by the server.
