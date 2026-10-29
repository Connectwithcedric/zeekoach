"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Post } from "@/lib/data";
import { fetchPost } from "@/lib/posts";
import { PostView } from "./post-view";

export function LivePost({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetchPost(id).then((p) => alive && setPost(p));
    return () => {
      alive = false;
    };
  }, [id]);
  if (post) return <PostView post={post} />;
  return (
    <div className="mx-auto mt-[30px] max-w-[440px] rounded-card bg-surface px-8 py-12 text-center">
      {post === undefined ? (
        <p className="text-[13px] font-semibold text-muted">Loading post…</p>
      ) : (
        <>
          <h1 className="text-[17px] font-bold">Post not found</h1>
          <p className="mt-1.5 text-[13px] font-semibold text-muted">It may have been deleted.</p>
          <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">Back to the feed</Link>
        </>
      )}
    </div>
  );
}
