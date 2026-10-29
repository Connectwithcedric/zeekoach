-- Gift cards: someone pays (Stripe) to give another member credit, which is spent on bookings.
create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  message text not null default '',
  payment_ref text unique,
  created_at timestamptz not null default now()
);
alter table public.gift_cards enable row level security;
drop policy if exists "See gifts you sent or got" on public.gift_cards;
create policy "See gifts you sent or got" on public.gift_cards for select using (auth.uid() in (buyer_id, recipient_id));

-- How much gift credit a booking used. Cancelled bookings give it back.
alter table public.bookings add column if not exists credit_used numeric(10, 2) not null default 0;

create or replace function public.notify_gift() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.recipient_id, new.buyer_id, 'gift', '/wallet', 'sent you a $' || new.amount || ' gift card' || case when new.message <> '' then ': ' || left(new.message, 80) else '' end);
  return new;
end; $$;
drop trigger if exists gift_cards_notify on public.gift_cards;
create trigger gift_cards_notify after insert on public.gift_cards for each row execute procedure public.notify_gift();
