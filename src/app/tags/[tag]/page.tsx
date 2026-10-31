import type { Metadata } from "next";
import { TagPage } from "./tag-page";

export const metadata: Metadata = { title: "Hashtag" };

export function generateStaticParams() {
  return [{ tag: "fitness" }];
}

// A hashtag: its posts (everyone's, or only from people you follow), and a Follow button, like the old app.
export default async function HashtagPage({ params }: PageProps<"/tags/[tag]">) {
  const { tag } = await params;
  return <TagPage tag={decodeURIComponent(tag).toLowerCase()} />;
}
