import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, posts } from "@/lib/data";
import { LivePost } from "./live-post";
import { PostView } from "./post-view";

export const metadata: Metadata = { title: "Post" };

export function generateStaticParams() {
  return posts.filter((p) => p.kind !== "live").map((p) => ({ id: p.id }));
}

export default async function PostPage({ params }: PageProps<"/post/[id]">) {
  const { id } = await params;
  const post = getPost(id);
  if (post) return <PostView post={post} />;
  // Real posts live in the database and load in the browser.
  if (/^[0-9a-f-]{36}$/.test(id)) return <LivePost id={id} />;
  notFound();
}
