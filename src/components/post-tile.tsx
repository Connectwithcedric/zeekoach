import Link from "next/link";
import { Eye, Layers, Lock, MessageSquareText, Play, ThumbsUp } from "lucide-react";
import { Photo } from "@/components/ui";
import type { Post } from "@/lib/data";

function Stats({ post }: { post: Post }) {
  return (
    <span className="flex items-center gap-3 rounded-lg bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
      {post.kind === "live" ? (
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-live" /> LIVE
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <ThumbsUp className="size-3.5" aria-hidden /> {post.likes}
        </span>
      )}
      <span className="flex items-center gap-1">
        <Eye className="size-3.5" aria-hidden /> {post.views}
      </span>
      {post.kind !== "live" && (
        <span className="flex items-center gap-1">
          <MessageSquareText className="size-3.5" aria-hidden /> {post.comments}
        </span>
      )}
    </span>
  );
}

// One tile of the Home grid. Counts show on hover, and always on live or locked videos.
export function PostTile({ post, w, h, className = "" }: { post: Post; w: number; h: number; className?: string }) {
  const alwaysShow = post.kind === "live" || post.locked;
  return (
    <Link href={post.kind === "live" ? "/live/tibere" : `/post/${post.id}`} className={`group relative block overflow-hidden rounded-[20px] bg-[#1b1b22] ${className}`}>
      {post.media?.length ? (
        post.kind === "video" ? (
          <video src={`${post.media[0]}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <img src={post.media[0]} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        )
      ) : (
        <Photo k={post.image} w={w} h={h} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
      )}
      {post.kind === "video" && !post.locked && <Play className="absolute right-4 top-4 size-5 fill-white text-white drop-shadow" aria-label="Video" />}
      {post.kind === "album" && <Layers className="absolute right-4 top-4 size-5 text-white drop-shadow" aria-label="Album" />}
      {post.locked && (
        <span className="absolute left-0 top-0 size-[100px] bg-gradient-to-br from-[#5b5b66]/90 from-50% to-transparent to-50%">
          <Lock className="absolute left-5 top-5 size-5 text-white" aria-label="Subscribers only" />
        </span>
      )}
      <span
        className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${
          alwaysShow ? "bg-transparent opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <Stats post={post} />
      </span>
    </Link>
  );
}
