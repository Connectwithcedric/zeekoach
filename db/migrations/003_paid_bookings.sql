-- Bookings are now created by the server (after Stripe confirms payment), not by the browser.
alter table public.bookings add column if not exists payment_ref text;

drop policy if exists "Book for yourself" on public.bookings;

-- People can still cancel their own booking, but not re-confirm it without paying.
drop policy if exists "Cancel your own booking" on public.bookings;
create policy "Cancel your own booking" on public.bookings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status = 'cancelled');
