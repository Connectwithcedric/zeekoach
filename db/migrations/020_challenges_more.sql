-- Challenges like the old app: links straight to one challenge, top rules, and comment notifications.
create or replace function public.notify_challenge() returns trigger language plpgsql security definer set search_path = '' as $$
declare link text := '/challenges?c=' || new.id;
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.opponent_id, new.challenger_id, 'challenge', link, 'challenged you: ' || new.rule);
  elsif new.status = 'live' and old.status = 'pending' then
    perform public.notify(new.challenger_id, new.opponent_id, 'challenge', link, 'accepted your challenge');
  elsif new.status = 'declined' and old.status = 'pending' then
    perform public.notify(new.challenger_id, new.opponent_id, 'challenge', link, 'declined your challenge');
  end if;
  return new;
end; $$;

create or replace function public.notify_challenge_comment() returns trigger language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select challenger_id, opponent_id into c from public.challenges where id = new.challenge_id;
  perform public.notify(c.challenger_id, new.user_id, 'comment', '/challenges?c=' || new.challenge_id, 'commented on your challenge: ' || left(new.body, 80));
  perform public.notify(c.opponent_id, new.user_id, 'comment', '/challenges?c=' || new.challenge_id, 'commented on your challenge: ' || left(new.body, 80));
  return new;
end; $$;
drop trigger if exists challenge_comments_notify on public.challenge_comments;
create trigger challenge_comments_notify after insert on public.challenge_comments for each row execute procedure public.notify_challenge_comment();

-- The rules people use most, for the "Challenge Someone" list.
create or replace function public.top_rules() returns table (rule text, uses bigint) language sql stable security definer set search_path = '' as $$
  select rule, count(*) as uses from public.challenges where status <> 'declined' group by rule order by uses desc, max(created_at) desc limit 8;
$$;
grant execute on function public.top_rules() to anon, authenticated;
