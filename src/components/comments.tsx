"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { RichText } from "@/components/rich-text";
import { Avatar } from "@/components/ui";
import { getPerson, type Person } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

export type Comment = { id: string; parent_id: string | null; body: string; created_at: string; author: Person; likes: number; liked: boolean };
type Row = { id: string; parent_id: string | null; body: string; created_at: string; author: Profile; comment_likes: { user_id: string }[] };

export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

// Comments on a post with one level of replies and likes, like the old app.
export function useComments(postId: string, enabled: boolean) {
  const { user } = useAuth();
  const [list, setList] = useState<Comment[]>([]);
  useEffect(() => {
    if (!enabled || !supabase) return;
    let alive = true;
    supabase
      .from("post_comments")
      .select("id, parent_id, body, created_at, author:profiles!post_comments_user_id_fkey(*), comment_likes(user_id)")
      .eq("post_id", postId)
      .order("created_at")
      .then(({ data }) => {
        if (!alive) return;
        setList(
          ((data ?? []) as unknown as Row[]).map((c) => {
            registerProfile(c.author);
            return { id: c.id, parent_id: c.parent_id, body: c.body, created_at: c.created_at, author: getPerson(c.author.id)!, likes: c.comment_likes.length, liked: !!user && c.comment_likes.some((l) => l.user_id === user.id) };
          }),
        );
      });
    return () => {
      alive = false;
    };
  }, [postId, enabled, user]);
  return [list, setList] as const;
}

export function CommentList({ list, setList, onReply }: { list: Comment[]; setList: (f: (l: Comment[]) => Comment[]) => void; onReply: (c: Comment) => void }) {
  const router = useRouter();
  const { user } = useAuth();

  async function like(c: Comment) {
    if (!supabase) return;
    if (!user) return router.push("/login");
    const next = !c.liked;
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, liked: next, likes: x.likes + (next ? 1 : -1) } : x)));
    const { error } = next
      ? await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: user.id })
      : await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
    if (error) setList((l) => l.map((x) => (x.id === c.id ? { ...x, liked: !next, likes: x.likes + (next ? -1 : 1) } : x)));
  }

  async function remove(c: Comment) {
    if (!supabase) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", c.id);
    if (!error) setList((l) => l.filter((x) => x.id !== c.id && x.parent_id !== c.id));
  }

  const row = (c: Comment, reply: boolean) => (
    <div key={c.id} className={`flex gap-3 ${reply ? "ml-11 mt-3" : ""}`}>
      <Link href={`/profile/${c.author.id}`} className="shrink-0"><Avatar person={c.author} size={reply ? 26 : 32} /></Link>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">
          <Link href={`/profile/${c.author.id}`} className="font-bold hover:text-primary">{c.author.name}</Link> <RichText text={c.body} />
        </p>
        <p className="mt-1 flex gap-3 text-[11px] font-semibold text-muted">
          <span>{ago(c.created_at)}</span>
          {c.likes > 0 && <span>{c.likes} {c.likes === 1 ? "like" : "likes"}</span>}
          <button type="button" onClick={() => onReply(c)} className="font-bold hover:text-ink">Reply</button>
          {user?.id === c.author.id && <button type="button" onClick={() => remove(c)} className="font-bold hover:text-live">Delete</button>}
        </p>
      </div>
      <button type="button" onClick={() => like(c)} aria-label={c.liked ? "Unlike comment" : "Like comment"} aria-pressed={c.liked} className="self-start pt-1">
        <Heart className={`size-3.5 ${c.liked ? "fill-live text-live" : "text-muted hover:text-ink"}`} />
      </button>
    </div>
  );

  return (
    <>
      {list.filter((c) => !c.parent_id).map((c) => (
        <div key={c.id}>
          {row(c, false)}
          {list.filter((r) => r.parent_id === c.id).map((r) => row(r, true))}
        </div>
      ))}
    </>
  );
}
