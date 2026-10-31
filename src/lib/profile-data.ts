"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/data";
import { postSelect, toPost, type PostRow } from "@/lib/posts";
import { streamSelect, type Stream } from "@/lib/streams";
import { supabase, type Profile } from "@/lib/supabase";

function useQuery<T>(run: (() => PromiseLike<T>) | null, deps: unknown[]) {
  const [value, setValue] = useState<T | null>(null);
  useEffect(() => {
    if (!run) return;
    let alive = true;
    run().then((v) => alive && setValue(v));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

// Posts someone is tagged in.
export const useTaggedPosts = (id: string, on: boolean) =>
  useQuery<Post[]>(
    on && supabase
      ? () => supabase!.from("post_tags").select(`post:posts(${postSelect})`).eq("user_id", id).order("created_at", { ascending: false }).limit(60)
          .then(({ data }) => ((data ?? []) as unknown as { post: PostRow | null }[]).flatMap((r) => (r.post ? [toPost(r.post)] : [])))
      : null,
    [id, on],
  );

// Posts someone liked.
export const useLikedPosts = (id: string, on: boolean) =>
  useQuery<Post[]>(
    on && supabase
      ? () => supabase!.from("post_likes").select(`post:posts(${postSelect})`).eq("user_id", id).order("created_at", { ascending: false }).limit(60)
          .then(({ data }) => ((data ?? []) as unknown as { post: PostRow | null }[]).flatMap((r) => (r.post ? [toPost(r.post)] : [])))
      : null,
    [id, on],
  );

export const useStreamsBy = (id: string, on: boolean) =>
  useQuery<Stream[]>(
    on && supabase ? () => supabase!.from("streams").select(streamSelect).eq("host_id", id).order("started_at", { ascending: false }).limit(30).then(({ data }) => (data ?? []) as Stream[]) : null,
    [id, on],
  );

export type ProfileChallenge = {
  id: string;
  rule: string;
  media: string;
  other: Profile;
  status: "pending" | "live" | "declined";
  result: "won" | "lost" | "tie" | "voting" | "waiting";
};

// Someone's challenges, with won / lost once the 24 hours of voting are over.
export const useChallengesOf = (id: string, on: boolean) =>
  useQuery<ProfileChallenge[]>(
    on && supabase
      ? () =>
          supabase!
            .from("challenges")
            .select("id, rule, media_a, media_b, status, ends_at, challenger_id, opponent_id, a:profiles!challenges_challenger_id_fkey(*), b:profiles!challenges_opponent_id_fkey(*), challenge_votes(side)")
            .or(`challenger_id.eq.${id},opponent_id.eq.${id}`)
            .neq("status", "declined")
            .order("created_at", { ascending: false })
            .limit(60)
            .then(({ data }) =>
              ((data ?? []) as unknown as { id: string; rule: string; media_a: string; media_b: string | null; status: "pending" | "live"; ends_at: string | null; challenger_id: string; a: Profile; b: Profile; challenge_votes: { side: "a" | "b" }[] }[]).map((c) => {
                const mine = c.challenger_id === id ? "a" : "b";
                const votes = { a: c.challenge_votes.filter((v) => v.side === "a").length, b: c.challenge_votes.filter((v) => v.side === "b").length };
                const theirs = mine === "a" ? "b" : "a";
                const over = c.ends_at && Date.parse(c.ends_at) < Date.now();
                const result = c.status === "pending" ? "waiting" : !over ? "voting" : votes[mine] > votes[theirs] ? "won" : votes[mine] < votes[theirs] ? "lost" : "tie";
                return { id: c.id, rule: c.rule, media: (mine === "a" ? c.media_a : c.media_b) ?? c.media_a, other: mine === "a" ? c.b : c.a, status: c.status, result };
              }),
            )
      : null,
    [id, on],
  );
