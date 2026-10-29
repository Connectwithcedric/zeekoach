-- Posts on the Home feed and profiles: photos, albums and videos, with likes and comments.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo', 'album', 'video')),
  media text[] not null check (cardinality(media) between 1 and 10),
  caption text not null default '' check (char_length(caption) <= 2200),
  views int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists posts_created_at on public.posts (created_at desc);
create index if not exists posts_author on public.posts (author_id, created_at desc);
alter table public.posts enable row level security;

drop policy if exists "Posts are public" on public.posts;
create policy "Posts are public" on public.posts for select using (true);
drop policy if exists "Post as yourself" on public.posts;
create policy "Post as yourself" on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists "Edit your own posts" on public.posts;
create policy "Edit your own posts" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
drop policy if exists "Delete your own posts" on public.posts;
create policy "Delete your own posts" on public.posts for delete using (auth.uid() = author_id);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "Likes are public" on public.post_likes;
create policy "Likes are public" on public.post_likes for select using (true);
drop policy if exists "Like as yourself" on public.post_likes;
create policy "Like as yourself" on public.post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Unlike as yourself" on public.post_likes;
create policy "Unlike as yourself" on public.post_likes for delete using (auth.uid() = user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post on public.post_comments (post_id, created_at);
alter table public.post_comments enable row level security;
drop policy if exists "Comments are public" on public.post_comments;
create policy "Comments are public" on public.post_comments for select using (true);
drop policy if exists "Comment as yourself" on public.post_comments;
create policy "Comment as yourself" on public.post_comments for insert with check (auth.uid() = user_id);
drop policy if exists "Delete your own comments" on public.post_comments;
create policy "Delete your own comments" on public.post_comments for delete using (auth.uid() = user_id);

-- Anyone viewing a post adds one view, without being able to change anything else.
create or replace function public.add_post_view(pid uuid)
returns void
language sql
security definer set search_path = ''
as $$ update public.posts set views = views + 1 where id = pid; $$;
grant execute on function public.add_post_view(uuid) to anon, authenticated;

-- Public bucket for post media, one folder per user.
do $$
begin
  insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;
  drop policy if exists "Users upload their own post media" on storage.objects;
  create policy "Users upload their own post media" on storage.objects for insert to authenticated
    with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
  drop policy if exists "Users delete their own post media" on storage.objects;
  create policy "Users delete their own post media" on storage.objects for delete to authenticated
    using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
exception when others then
  raise warning 'post storage setup skipped: %', sqlerrm;
end;
$$;
