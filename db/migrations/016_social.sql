-- The rest of the old YouKoach social rules: comment replies and likes, tagging people in posts,
-- following hashtags and places, blocking, muting, reporting, and reviews of Koaches.

alter table public.post_comments add column if not exists parent_id uuid references public.post_comments (id) on delete cascade;
create index if not exists post_comments_parent on public.post_comments (parent_id);

create table if not exists public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
alter table public.comment_likes enable row level security;
drop policy if exists "Comment likes are public" on public.comment_likes;
create policy "Comment likes are public" on public.comment_likes for select using (true);
drop policy if exists "Like comments as yourself" on public.comment_likes;
create policy "Like comments as yourself" on public.comment_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Unlike comments as yourself" on public.comment_likes;
create policy "Unlike comments as yourself" on public.comment_likes for delete using (auth.uid() = user_id);

-- People tagged in a post. The author tags; the tagged person can remove themselves.
create table if not exists public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_tags_user on public.post_tags (user_id, created_at desc);
alter table public.post_tags enable row level security;
drop policy if exists "Tags are public" on public.post_tags;
create policy "Tags are public" on public.post_tags for select using (true);
drop policy if exists "Authors tag people" on public.post_tags;
create policy "Authors tag people" on public.post_tags for insert
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
drop policy if exists "Untag" on public.post_tags;
create policy "Untag" on public.post_tags for delete
  using (auth.uid() = user_id or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- Hashtags are read from captions; people can follow a hashtag.
alter table public.posts add column if not exists hashtags text[] not null default '{}';
create index if not exists posts_hashtags on public.posts using gin (hashtags);
create or replace function public.posts_set_hashtags()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.hashtags := coalesce((
    select array_agg(distinct lower(m[1])) from regexp_matches(new.caption, '#([A-Za-z0-9_]{1,50})', 'g') as m
  ), '{}');
  return new;
end;
$$;
drop trigger if exists posts_hashtags on public.posts;
create trigger posts_hashtags before insert or update of caption on public.posts
  for each row execute procedure public.posts_set_hashtags();
update public.posts set caption = caption where hashtags = '{}' and caption like '%#%';

create table if not exists public.hashtag_follows (
  tag text not null check (tag ~ '^[a-z0-9_]{1,50}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tag, user_id)
);
alter table public.hashtag_follows enable row level security;
drop policy if exists "Hashtag follows are public" on public.hashtag_follows;
create policy "Hashtag follows are public" on public.hashtag_follows for select using (true);
drop policy if exists "Follow hashtags as yourself" on public.hashtag_follows;
create policy "Follow hashtags as yourself" on public.hashtag_follows for insert with check (auth.uid() = user_id);
drop policy if exists "Unfollow hashtags as yourself" on public.hashtag_follows;
create policy "Unfollow hashtags as yourself" on public.hashtag_follows for delete using (auth.uid() = user_id);

create table if not exists public.place_follows (
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, user_id)
);
alter table public.place_follows enable row level security;
drop policy if exists "Place follows are public" on public.place_follows;
create policy "Place follows are public" on public.place_follows for select using (true);
drop policy if exists "Follow places as yourself" on public.place_follows;
create policy "Follow places as yourself" on public.place_follows for insert with check (auth.uid() = user_id);
drop policy if exists "Unfollow places as yourself" on public.place_follows;
create policy "Unfollow places as yourself" on public.place_follows for delete using (auth.uid() = user_id);

-- Blocking and muting are private to the person who does it.
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create table if not exists public.mutes (
  muter_id uuid not null references public.profiles (id) on delete cascade,
  muted_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
alter table public.blocks enable row level security;
alter table public.mutes enable row level security;
drop policy if exists "See your blocks" on public.blocks;
create policy "See your blocks" on public.blocks for select using (auth.uid() = blocker_id);
drop policy if exists "Block as yourself" on public.blocks;
create policy "Block as yourself" on public.blocks for insert with check (auth.uid() = blocker_id);
drop policy if exists "Unblock as yourself" on public.blocks;
create policy "Unblock as yourself" on public.blocks for delete using (auth.uid() = blocker_id);
drop policy if exists "See your mutes" on public.mutes;
create policy "See your mutes" on public.mutes for select using (auth.uid() = muter_id);
drop policy if exists "Mute as yourself" on public.mutes;
create policy "Mute as yourself" on public.mutes for insert with check (auth.uid() = muter_id);
drop policy if exists "Unmute as yourself" on public.mutes;
create policy "Unmute as yourself" on public.mutes for delete using (auth.uid() = muter_id);

-- Blocking someone also removes the follows between you.
create or replace function public.blocks_unfollow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.follows where (follower_id = new.blocker_id and followee_id = new.blocked_id)
    or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;
drop trigger if exists blocks_unfollow on public.blocks;
create trigger blocks_unfollow after insert on public.blocks for each row execute procedure public.blocks_unfollow();

-- Reports go to the admins; reporters only see their own.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'post', 'comment', 'session', 'challenge', 'place', 'message')),
  target_id text not null,
  reason text not null check (char_length(reason) between 1 and 100),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "See your reports" on public.reports;
create policy "See your reports" on public.reports for select using (auth.uid() = reporter_id);
drop policy if exists "Report as yourself" on public.reports;
create policy "Report as yourself" on public.reports for insert with check (auth.uid() = reporter_id);

-- Reviews of a Koach, one per person per session they booked and attended.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  koach_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (reviewer_id, session_id),
  check (reviewer_id <> koach_id)
);
create index if not exists reviews_koach on public.reviews (koach_id, created_at desc);
alter table public.reviews enable row level security;
drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public" on public.reviews for select using (true);
drop policy if exists "Review sessions you booked" on public.reviews;
create policy "Review sessions you booked" on public.reviews for insert with check (
  auth.uid() = reviewer_id
  and exists (select 1 from public.bookings b join public.sessions s on s.id = b.session_id
              where b.session_id = reviews.session_id and b.user_id = auth.uid() and s.koach_id = reviews.koach_id)
);
drop policy if exists "Delete your reviews" on public.reviews;
create policy "Delete your reviews" on public.reviews for delete using (auth.uid() = reviewer_id);

-- Notifications for the new actions.
create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify((select author_id from public.posts where id = new.post_id), new.user_id, 'comment', '/post/' || new.post_id, 'commented: ' || left(new.body, 80));
  if new.parent_id is not null then
    perform public.notify((select user_id from public.post_comments where id = new.parent_id), new.user_id, 'comment', '/post/' || new.post_id, 'replied to your comment: ' || left(new.body, 80));
  end if;
  return new;
end; $$;

create or replace function public.notify_comment_like() returns trigger language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select user_id, post_id into c from public.post_comments where id = new.comment_id;
  perform public.notify(c.user_id, new.user_id, 'like', '/post/' || c.post_id, 'liked your comment');
  return new;
end; $$;
drop trigger if exists comment_likes_notify on public.comment_likes;
create trigger comment_likes_notify after insert on public.comment_likes for each row execute procedure public.notify_comment_like();

create or replace function public.notify_tag() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.user_id, (select author_id from public.posts where id = new.post_id), 'tag', '/post/' || new.post_id, 'tagged you in a post');
  return new;
end; $$;
drop trigger if exists post_tags_notify on public.post_tags;
create trigger post_tags_notify after insert on public.post_tags for each row execute procedure public.notify_tag();

create or replace function public.notify_review() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(new.koach_id, new.reviewer_id, 'review', '/profile/' || new.koach_id, 'gave you ' || new.rating || ' stars');
  return new;
end; $$;
drop trigger if exists reviews_notify on public.reviews;
create trigger reviews_notify after insert on public.reviews for each row execute procedure public.notify_review();
