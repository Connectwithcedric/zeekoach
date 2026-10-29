"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

export type PostRow = {
  id: string;
  author_id: string;
  kind: "photo" | "album" | "video";
  media: string[];
  caption: string;
  views: number;
  created_at: string;
  author: Profile | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
};

export const postSelect = "*, author:profiles!posts_author_id_fkey(*), post_likes(count), post_comments(count)";

export function toPost(r: PostRow): Post {
  if (r.author) registerProfile(r.author);
  return {
    id: r.id,
    image: "gym",
    kind: r.kind,
    media: r.media,
    authorId: r.author_id,
    caption: r.caption,
    createdAt: r.created_at,
    views: r.views,
    likes: r.post_likes[0]?.count ?? 0,
    comments: r.post_comments[0]?.count ?? 0,
    real: true,
  };
}

// Latest real posts: everyone's (Explore) or only from people you follow (Following).
export function useFeed(mode: "explore" | "following", userId: string | undefined) {
  const [posts, setPosts] = useState<Post[] | null>(supabase ? null : []);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    (async () => {
      let q = supabase!.from("posts").select(postSelect).order("created_at", { ascending: false }).limit(60);
      if (mode === "following") {
        if (!userId) return alive && setPosts([]);
        const { data: f } = await supabase!.from("follows").select("followee_id").eq("follower_id", userId);
        const ids = (f ?? []).map((x) => x.followee_id as string);
        if (!ids.length) return alive && setPosts([]);
        q = q.in("author_id", ids);
      }
      const { data } = await q;
      if (alive) setPosts(((data ?? []) as PostRow[]).map(toPost));
    })();
    return () => {
      alive = false;
    };
  }, [mode, userId]);
  return posts;
}

export function usePostsBy(authorId: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  useEffect(() => {
    if (!supabase || !authorId) return;
    let alive = true;
    supabase
      .from("posts")
      .select(postSelect)
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => alive && setPosts(((data ?? []) as PostRow[]).map(toPost)));
    return () => {
      alive = false;
    };
  }, [authorId]);
  return posts;
}

export async function fetchPost(id: string) {
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase.from("posts").select(postSelect).eq("id", id).maybeSingle();
  return data ? toPost(data as PostRow) : null;
}
