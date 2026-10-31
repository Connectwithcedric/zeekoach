"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Grid3x3, HeartPulse, Radio, Tag, ThumbsUp } from "lucide-react";
import { PostTile } from "@/components/post-tile";
import { Card } from "@/components/ui";
import { posts as demoPosts } from "@/lib/data";
import { usePostsBy } from "@/lib/posts";
import { useChallengesOf, useLikedPosts, useStreamsBy, useTaggedPosts } from "@/lib/profile-data";
import { isLive } from "@/lib/streams";
import type { Post } from "@/lib/data";

const tabs = [
  { label: "Sessions", Icon: HeartPulse },
  { label: "Streams", Icon: Radio },
  { label: "Posts", Icon: Grid3x3 },
  { label: "Tagged", Icon: Tag },
  { label: "Challenges", Icon: Award },
  { label: "Likes", Icon: ThumbsUp },
];

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <Card className="py-12 text-center">
      <p className="text-[15px] font-bold">Nothing here yet</p>
      <p className="mt-1 text-[13px] font-semibold text-muted">{text}</p>
      {action}
    </Card>
  );
}

// Icon tabs under the profile, as in the Figma, and the content of the chosen tab.
export function ProfileContent({ personId, real, isOwner, sessionsPanel }: { personId: string; real: boolean; isOwner: boolean; sessionsPanel: React.ReactNode }) {
  const [active, setActive] = useState(0);
  const realPosts = usePostsBy(real ? personId : "");
  const posts = real ? realPosts : demoPosts.filter((p) => p.kind !== "live").slice(0, 6);
  const label = tabs[active].label;
  const tagged = useTaggedPosts(personId, real && label === "Tagged");
  const liked = useLikedPosts(personId, real && label === "Likes");
  const streams = useStreamsBy(personId, real && label === "Streams");
  const challenges = useChallengesOf(personId, real && label === "Challenges");
  const [result, setResult] = useState<"all" | "won" | "lost">("all");
  const grid = (list: Post[] | null, empty: string) =>
    list === null ? <Empty text="Loading…" /> : list.length ? (
      <div className="grid grid-cols-3 gap-[15px] max-sm:gap-2">{list.map((p) => <PostTile key={p.id} post={p} w={200} h={200} className="aspect-square" />)}</div>
    ) : <Empty text={empty} />;

  return (
    <>
      <div role="tablist" className="flex h-[70px] items-center justify-between rounded-card bg-surface px-5">
        {tabs.map(({ label, Icon }, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={i === active}
            aria-label={label}
            title={label}
            onClick={() => setActive(i)}
            className={`flex h-11 w-[60px] items-center justify-center rounded-[12px] transition-colors ${
              i === active ? "bg-primary text-white" : "text-[#7c7c8a] hover:text-primary"
            }`}
          >
            <Icon className="size-[19px]" strokeWidth={1.8} />
          </button>
        ))}
      </div>
      {label === "Sessions" ? (
        sessionsPanel
      ) : label === "Posts" ? (
        posts.length ? (
          <div className="grid grid-cols-3 gap-[15px] max-sm:gap-2">
            {posts.map((p) => (
              <PostTile key={p.id} post={p} w={200} h={200} className="aspect-square" />
            ))}
          </div>
        ) : (
          <Empty
            text={isOwner ? "Share your first photo or video." : "No posts yet."}
            action={isOwner && <Link href="/post/new" className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">New post</Link>}
          />
        )
      ) : !real ? (
        <Empty text={`${label} will show up here.`} />
      ) : label === "Tagged" ? (
        grid(tagged, isOwner ? "Posts you're tagged in show up here." : "No one has tagged them yet.")
      ) : label === "Likes" ? (
        grid(liked, isOwner ? "Posts you like show up here." : "No liked posts yet.")
      ) : label === "Streams" ? (
        streams === null ? <Empty text="Loading…" /> : streams.length ? (
          <div className="grid gap-[15px] sm:grid-cols-2">
            {streams.map((s) => (
              <Link key={s.id} href={`/live/${s.id}`} className="flex items-center gap-3 rounded-card bg-surface p-4 hover:bg-primary-soft">
                <span className={`grid size-11 place-items-center rounded-[12px] ${isLive(s) ? "bg-live text-white" : "bg-bg text-primary"}`}><Radio className="size-5" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-bold">{s.title || "Live stream"}</span>
                  <span className="text-[12px] font-semibold text-muted">{isLive(s) ? "Live now" : new Date(s.started_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : <Empty text={isOwner ? "Go live from your profile and your streams show up here." : "No streams yet."} />
      ) : label === "Challenges" ? (
        challenges === null ? <Empty text="Loading…" /> : (
          <>
            <div className="flex gap-2">
              {(["all", "won", "lost"] as const).map((r) => (
                <button key={r} onClick={() => setResult(r)} className={`h-9 rounded-[10px] px-4 text-[13px] font-bold capitalize ${result === r ? "bg-primary text-white" : "bg-surface text-muted hover:text-primary"}`}>{r}</button>
              ))}
            </div>
            {challenges.filter((c) => result === "all" || c.result === result).length ? (
              <div className="grid grid-cols-3 gap-[15px] max-sm:gap-2">
                {challenges.filter((c) => result === "all" || c.result === result).map((c) => (
                  <Link key={c.id} href="/challenges" className="group relative block aspect-square overflow-hidden rounded-[20px] bg-[#1b1b22]">
                    {/\.(mp4|mov|webm)(\?|$)/i.test(c.media) ? <video src={`${c.media}#t=0.1`} muted className="size-full object-cover" /> : <img src={c.media} alt="" className="size-full object-cover" />}
                    <span className={`absolute left-2 top-2 rounded-[8px] px-2 py-0.5 text-[11px] font-extrabold uppercase text-white ${c.result === "won" ? "bg-primary" : c.result === "lost" ? "bg-live" : "bg-black/50"}`}>{c.result}</span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-2 text-[12px] font-bold text-white">{c.rule} · vs {c.other.name}</span>
                  </Link>
                ))}
              </div>
            ) : <Empty text={result === "all" ? "No challenges yet." : `No ${result} challenges yet.`} />}
          </>
        )
      ) : (
        <Empty text={`${label} will show up here.`} />
      )}
    </>
  );
}
