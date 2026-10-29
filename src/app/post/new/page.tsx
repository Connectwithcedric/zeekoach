import type { Metadata } from "next";
import { NewPost } from "./new-post";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return <NewPost />;
}
