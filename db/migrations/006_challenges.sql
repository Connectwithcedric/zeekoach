-- Challenges: someone challenges another person with a rule and their own attempt (photo or video).
-- When the other person accepts with their attempt, everyone can vote for 24 hours.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id) on delete cascade,
  rule text not null check (char_length(rule) between 3 and 140),
  media_a text not null,
  media_b text,
  status text not null default 'pending' check (status in ('pending', 'live', 'declined')),
  ends_at timestamptz,
  views int not null default 0,
  created_at timestamptz not null default now(),
  check (challenger_id <> opponent_id)
);
create index if not exists challenges_live on public.challenges (status, ends_at desc);
alter table public.challenges enable row level security;

drop policy if exists "Live challenges are public, pending ones are private" on public.challenges;
create policy "Live challenges are public, pending ones are private" on public.challenges for select
  using (status = 'live' or auth.uid() in (challenger_id, opponent_id));
drop policy if exists "Challenge someone as yourself" on public.challenges;
create policy "Challenge someone as yourself" on public.challenges for insert
  with check (auth.uid() = challenger_id and status = 'pending' and media_b is null and ends_at is null);
drop policy if exists "Withdraw your challenge" on public.challenges;
create policy "Withdraw your challenge" on public.challenges for delete using (auth.uid() = challenger_id and status <> 'live');

-- The opponent accepts (with their attempt) or declines.
create or replace function public.respond_challenge(cid uuid, accept boolean, media text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if accept and (media is null or media = '') then
    raise exception 'Add your attempt to accept';
  end if;
  update public.challenges
    set status = case when accept then 'live' else 'declined' end,
        media_b = case when accept then media else null end,
        ends_at = case when accept then now() + interval '24 hours' else null end
    where id = cid and opponent_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'This challenge is not waiting for you';
  end if;
end;
$$;
grant execute on function public.respond_challenge(uuid, boolean, text) to authenticated;

create or replace function public.add_challenge_view(cid uuid)
returns void
language sql
security definer set search_path = ''
as $$ update public.challenges set views = views + 1 where id = cid and status = 'live'; $$;
grant execute on function public.add_challenge_view(uuid) to anon, authenticated;

create table if not exists public.challenge_votes (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  side text not null check (side in ('a', 'b')),
  created_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
alter table public.challenge_votes enable row level security;
drop policy if exists "Votes are public" on public.challenge_votes;
create policy "Votes are public" on public.challenge_votes for select using (true);
drop policy if exists "Vote once while a challenge is live" on public.challenge_votes;
create policy "Vote once while a challenge is live" on public.challenge_votes for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.status = 'live' and c.ends_at > now() and auth.uid() not in (c.challenger_id, c.opponent_id)
  )
);

create table if not exists public.challenge_likes (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (challenge_id, user_id)
);
alter table public.challenge_likes enable row level security;
drop policy if exists "Challenge likes are public" on public.challenge_likes;
create policy "Challenge likes are public" on public.challenge_likes for select using (true);
drop policy if exists "Like challenges as yourself" on public.challenge_likes;
create policy "Like challenges as yourself" on public.challenge_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Unlike challenges as yourself" on public.challenge_likes;
create policy "Unlike challenges as yourself" on public.challenge_likes for delete using (auth.uid() = user_id);

create table if not exists public.challenge_comments (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.challenge_comments enable row level security;
drop policy if exists "Challenge comments are public" on public.challenge_comments;
create policy "Challenge comments are public" on public.challenge_comments for select using (true);
drop policy if exists "Comment on challenges as yourself" on public.challenge_comments;
create policy "Comment on challenges as yourself" on public.challenge_comments for insert with check (auth.uid() = user_id);
