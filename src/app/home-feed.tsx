"use client";

import Link from "next/link";
import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PostTile } from "@/components/post-tile";
import { ExploreFollowing } from "@/components/tabs-bar";
import { Card } from "@/components/ui";
import { posts as demoPosts, showSamples, type Post } from "@/lib/data";
import { useFeed } from "@/lib/posts";

const square = (p: Post) => <PostTile key={p.id} post={p} w={194} h={194} className="aspect-square" />;
const wide = (p: Post) => <PostTile key={p.id} post={p} w={305} h={200} className="aspect-[305/200]" />;

// The Home grid from the Figma: three squares, a big tile, two wide tiles, then rows of three.
// Explore shows everyone's real posts first, then the sample posts; Following shows posts from people you follow.
export function HomeFeed() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"explore" | "following">("explore");
  const real = useFeed(mode, user?.id);
  const list = mode === "explore" ? [...(real ?? []), ...(showSamples ? demoPosts.filter((p) => p.kind !== "live") : [])] : (real ?? []);
  const liveTile = showSamples ? demoPosts.find((p) => p.kind === "live") : undefined;
  const [a, b, c, big, d, e, w2, ...rest] = list;

  return (
    <>
      <ExploreFollowing onChange={setMode} />
      {mode === "following" && real && !real.length ? (
        <Card className="px-8 py-14 text-center">
          <p className="text-[15px] font-bold">{user ? "Nothing here yet" : "Log in to see who you follow"}</p>
          <p className="mx-auto mt-1 max-w-[360px] text-[13px] font-semibold text-muted">
            {user ? "Follow Koaches and friends to see their posts here." : "Posts from people you follow show up here."}
          </p>
          <Link href={user ? "/map" : "/login"} className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">
            {user ? "Find Koaches near you" : "Log in"}
          </Link>
        </Card>
      ) : (
        <div>
          <Link href="/post/new" className="mb-[30px] flex h-[54px] items-center justify-center gap-2 rounded-card bg-surface text-[13px] font-bold text-primary hover:bg-primary-soft max-sm:mb-2">
            <ImagePlus className="size-4" aria-hidden /> Share a photo or video
          </Link>
          <div className="grid grid-cols-3 gap-[29px] max-sm:gap-2">
            {[a, b, c].filter(Boolean).map(square)}
            {big && <PostTile post={big} w={417} h={417} className="col-span-2 row-span-2 aspect-square" />}
            {[d, e].filter(Boolean).map(square)}
          </div>
          {(w2 || (mode === "explore" && liveTile)) && (
            <div className="mt-[30px] grid grid-cols-2 gap-[30px] max-sm:mt-2 max-sm:gap-2">
              {mode === "explore" && liveTile && wide(liveTile)}
              {w2 && wide(w2)}
            </div>
          )}
          {rest.length > 0 && <div className="mt-[30px] grid grid-cols-3 gap-[29px] max-sm:mt-2 max-sm:gap-2">{rest.map(square)}</div>}
        </div>
      )}
    </>
  );
}
