-- Wallet like the old app: add funds, send money, tips, money requests and withdrawals.
-- Only server routes write money rows; people can read their own.
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount <> 0),
  kind text not null check (kind in ('topup', 'send', 'receive', 'tip_sent', 'tip_received', 'withdraw', 'withdraw_returned')),
  counterparty_id uuid references public.profiles (id) on delete set null,
  note text not null default '' check (char_length(note) <= 200),
  ref text,
  status text not null default 'done' check (status in ('done', 'pending')),
  created_at timestamptz not null default now()
);
create unique index if not exists wallet_transactions_ref on public.wallet_transactions (kind, ref) where ref is not null;
create index if not exists wallet_transactions_user on public.wallet_transactions (user_id, created_at desc);
alter table public.wallet_transactions enable row level security;
drop policy if exists "See your wallet" on public.wallet_transactions;
create policy "See your wallet" on public.wallet_transactions for select using (auth.uid() = user_id);

create table if not exists public.money_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0 and amount <= 5000),
  note text not null default '' check (char_length(note) <= 200),
  status text not null default 'pending' check (status in ('pending', 'paid', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  check (requester_id <> payer_id)
);
alter table public.money_requests enable row level security;
drop policy if exists "See requests you sent or got" on public.money_requests;
create policy "See requests you sent or got" on public.money_requests for select using (auth.uid() in (requester_id, payer_id));
drop policy if exists "Ask for money as yourself" on public.money_requests;
create policy "Ask for money as yourself" on public.money_requests for insert with check (auth.uid() = requester_id and status = 'pending');

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payout_to text not null check (char_length(payout_to) between 4 and 200),
  status text not null default 'requested' check (status in ('requested', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
alter table public.withdrawals enable row level security;
drop policy if exists "See your withdrawals" on public.withdrawals;
create policy "See your withdrawals" on public.withdrawals for select using (auth.uid() = user_id);

-- Stripe customer per person, for saved cards. Server only.
create table if not exists public.stripe_customers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  customer_id text not null unique
);
alter table public.stripe_customers enable row level security;

-- The wallet in one place. Gift credit is spent first and can't be withdrawn.
create or replace function public.wallet_summary(uid uuid)
returns table (balance numeric, withdrawable numeric, pending numeric, gift_left numeric)
language sql stable security definer set search_path = '' as $$
  with
    ledger as (select coalesce(sum(amount), 0) as v from public.wallet_transactions where user_id = uid),
    gifts as (select coalesce(sum(amount), 0) as v from public.gift_cards where recipient_id = uid),
    used as (select coalesce(sum(credit_used), 0) as v from public.bookings where user_id = uid and status = 'confirmed'),
    earned as (
      select coalesce(sum(round(b.total / 1.32, 2)) filter (where s.ends_at <= now()), 0) as done,
             coalesce(sum(round(b.total / 1.32, 2)) filter (where s.ends_at > now()), 0) as later
      from public.bookings b join public.sessions s on s.id = b.session_id
      where s.koach_id = uid and b.status = 'confirmed'
    ),
    t as (select ledger.v + gifts.v + earned.done - used.v as total, greatest(0, gifts.v - used.v) as gift, earned.later from ledger, gifts, used, earned)
  select greatest(0, total), greatest(0, total - gift), later, least(gift, greatest(0, total)) from t;
$$;
revoke execute on function public.wallet_summary(uuid) from public, anon, authenticated;

create or replace function public.my_wallet()
returns table (balance numeric, withdrawable numeric, pending numeric, gift_left numeric)
language sql stable security definer set search_path = '' as $$ select * from public.wallet_summary(auth.uid()); $$;
grant execute on function public.my_wallet() to authenticated;

create or replace function public.notify_wallet() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'receive' then
    perform public.notify(new.user_id, new.counterparty_id, 'money', '/wallet', 'sent you $' || new.amount || case when new.note <> '' then ': ' || left(new.note, 80) else '' end);
  elsif new.kind = 'tip_received' then
    perform public.notify(new.user_id, new.counterparty_id, 'tip', '/wallet', 'tipped you $' || new.amount || case when new.note <> '' then ': ' || left(new.note, 80) else '' end);
  end if;
  return new;
end; $$;
drop trigger if exists wallet_transactions_notify on public.wallet_transactions;
create trigger wallet_transactions_notify after insert on public.wallet_transactions for each row execute procedure public.notify_wallet();

create or replace function public.notify_money_request() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.payer_id, new.requester_id, 'money', '/wallet', 'asked you for $' || new.amount || case when new.note <> '' then ': ' || left(new.note, 80) else '' end);
  elsif new.status = 'declined' and old.status = 'pending' then
    perform public.notify(new.requester_id, new.payer_id, 'money', '/wallet', 'declined your request for $' || new.amount);
  end if;
  return new;
end; $$;
drop trigger if exists money_requests_notify on public.money_requests;
create trigger money_requests_notify after insert or update on public.money_requests for each row execute procedure public.notify_money_request();

-- The payer declines a request, or the person who asked cancels it. Paying goes through the server.
create or replace function public.answer_money_request(rid uuid, answer text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if answer = 'declined' then
    update public.money_requests set status = 'declined' where id = rid and payer_id = auth.uid() and status = 'pending';
  elsif answer = 'cancelled' then
    update public.money_requests set status = 'cancelled' where id = rid and requester_id = auth.uid() and status = 'pending';
  end if;
  if not found then raise exception 'This request is not waiting for you'; end if;
end; $$;
grant execute on function public.answer_money_request(uuid, text) to authenticated;
