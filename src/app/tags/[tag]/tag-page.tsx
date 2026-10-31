"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Hash } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PostTile } from "@/components/post-tile";
import { ExploreFollowing } from "@/components/tabs-bar";
import { Card } from "@/components/ui";
import type { Post } from "@/lib/data";
import { postSelect, toPost, type PostRow } from "@/lib/posts";
import { supabase } from "@/lib/supabase";

export function TagPage({ tag }: { tag: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<"explore" | "following">("explore");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [total, setTotal] = useState(0);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    (async () => {
      let q = supabase!.from("posts").select(postSelect).contains("hashtags", [tag]).order("created_at", { ascending: false }).limit(90);
      if (mode === "following") {
        if (!user) return alive && setPosts([]);
        const ids = ((await supabase!.from("follows").select("followee_id").eq("follower_id", user.id)).data ?? []).map((f) => f.followee_id as string);
        if (!ids.length) return alive && setPosts([]);
        q = q.in("author_id", ids);
      }
      const { data } = await q;
      if (alive) setPosts(((data ?? []) as PostRow[]).map(toPost));
    })();
    return () => {
      alive = false;
    };
  }, [tag, mode, user]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("posts").select("id", { count: "exact", head: true }).contains("hashtags", [tag]).then(({ count }) => setTotal(count ?? 0));
    supabase.from("hashtag_follows").select("user_id").eq("tag", tag).then(({ data }) => {
      setFollowers(data?.length ?? 0);
      setFollowing(!!user && !!data?.some((f) => f.user_id === user.id));
    });
  }, [tag, user]);

  async function toggle() {
    if (!supabase) return;
    if (!user) return router.push("/login");
    const next = !following;
    setFollowing(next);
    setFollowers((n) => n + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("hashtag_follows").insert({ tag, user_id: user.id })
      : await supabase.from("hashtag_follows").delete().eq("tag", tag).eq("user_id", user.id);
    if (error) {
      setFollowing(!next);
      setFollowers((n) => n + (next ? -1 : 1));
    }
  }

  return (
    <div className="mx-auto mt-[30px] max-w-[880px] space-y-[30px]">
      <Card className="flex items-center gap-5 px-8 py-7 max-sm:px-5">
        <span className="grid size-[78px] shrink-0 place-items-center rounded-[20px] bg-primary-soft text-primary"><Hash className="size-9" /></span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[24px] font-extrabold">#{tag}</h1>
          <p className="mt-1 text-[13px] font-semibold text-muted">{total} {total === 1 ? "post" : "posts"} · {followers} {followers === 1 ? "follower" : "followers"}</p>
        </div>
        <button onClick={toggle} className={`h-10 rounded-[10px] px-6 text-[13px] font-bold ${following ? "bg-primary-soft text-primary" : "bg-primary text-white"}`}>
          {following ? "Following" : "Follow"}
        </button>
      </Card>
      <ExploreFollowing onChange={setMode} />
      {posts && !posts.length ? (
        <Card className="px-8 py-14 text-center text-[14px] font-semibold text-muted">
          {mode === "following" ? (user ? "Nobody you follow has posted with this hashtag yet." : "Log in to see posts from people you follow.") : "No posts with this hashtag yet."}
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-[29px] max-sm:gap-2">{(posts ?? []).map((p) => <PostTile key={p.id} post={p} w={280} h={280} className="aspect-square" />)}</div>
      )}
    </div>
  );
}
