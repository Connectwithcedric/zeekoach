"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, Grid3x3, HeartPulse, Radio, Tag, ThumbsUp } from "lucide-react";
import { PostTile } from "@/components/post-tile";
import { Card } from "@/components/ui";
import { posts as demoPosts } from "@/lib/data";
import { usePostsBy } from "@/lib/posts";

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
      ) : (
        <Empty text={`${label} will show up here.`} />
      )}
    </>
  );
}
