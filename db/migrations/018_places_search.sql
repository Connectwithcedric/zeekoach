-- Places on posts and sessions, so a place page can show its posts and classes (old app's location pages),
-- and hashtag search with post counts.
alter table public.posts add column if not exists place_id uuid references public.places (id) on delete set null;
create index if not exists posts_place on public.posts (place_id, created_at desc);
alter table public.sessions add column if not exists place_id uuid references public.places (id) on delete set null;
create index if not exists sessions_place on public.sessions (place_id, starts_at);

create or replace function public.search_hashtags(q text)
returns table (tag text, posts bigint)
language sql stable set search_path = '' as $$
  select t, count(*) from public.posts, unnest(hashtags) as t
  where t like lower(regexp_replace(q, '[^A-Za-z0-9_]', '', 'g')) || '%'
  group by t order by count(*) desc, t limit 20;
$$;
grant execute on function public.search_hashtags(text) to anon, authenticated;

-- Most used hashtags lately, for Discover.
create or replace function public.top_hashtags()
returns table (tag text, posts bigint)
language sql stable set search_path = '' as $$
  select t, count(*) from public.posts, unnest(hashtags) as t
  where created_at > now() - interval '30 days'
  group by t order by count(*) desc limit 12;
$$;
grant execute on function public.top_hashtags() to anon, authenticated;
