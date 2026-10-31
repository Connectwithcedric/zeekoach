"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, MessageSquareText, ThumbsUp, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { FollowToggle } from "@/components/follow-toggle";
import { Avatar, Photo } from "@/components/ui";
import { getPerson, people, posts as demoPosts, type Person, type Post } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

type Comment = { id: string; body: string; created_at: string; author: Person };

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

function Media({ post }: { post: Post }) {
  const [i, setI] = useState(0);
  const media = post.media ?? [];
  if (!media.length) return <Photo k={post.image} w={640} h={640} className="aspect-square w-full" />;
  if (post.kind === "video") return <video src={media[0]} controls playsInline className="aspect-square w-full bg-black object-contain" />;
  return (
    <div className="relative">
      <img src={media[i]} alt="" className="aspect-square w-full bg-black object-contain" />
      {media.length > 1 && (
        <>
          <button onClick={() => setI((i - 1 + media.length) % media.length)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink">
            <ChevronLeft className="size-5" />
          </button>
          <button onClick={() => setI((i + 1) % media.length)} aria-label="Next photo" className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-ink">
            <ChevronRight className="size-5" />
          </button>
          <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, j) => (
              <span key={j} className={`size-1.5 rounded-full ${j === i ? "bg-white" : "bg-white/50"}`} />
            ))}
          </span>
        </>
      )}
    </div>
  );
}

// One post with its media, author, likes and comments. Demo posts work too, but nothing is saved for them.
export function PostView({ post }: { post: Post }) {
  const router = useRouter();
  const { user } = useAuth();
  const author = (post.authorId && getPerson(post.authorId)) || people[demoPosts.findIndex((p) => p.id === post.id) % people.length] || people[0];
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const real = !!post.real && !!supabase;

  useEffect(() => {
    if (!real) return;
    let alive = true;
    supabase!.rpc("add_post_view", { pid: post.id });
    supabase!
      .from("post_comments")
      .select("id, body, created_at, author:profiles!post_comments_user_id_fkey(*)")
      .eq("post_id", post.id)
      .order("created_at")
      .then(({ data }) => {
        if (!alive) return;
        setComments(
          ((data ?? []) as unknown as { id: string; body: string; created_at: string; author: Profile }[]).map((c) => {
            registerProfile(c.author);
            return { id: c.id, body: c.body, created_at: c.created_at, author: getPerson(c.author.id)! };
          }),
        );
      });
    return () => {
      alive = false;
    };
  }, [real, post.id]);

  useEffect(() => {
    if (!real || !user) return;
    supabase!
      .from("post_likes")
      .select("post_id")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [real, user, post.id]);

  async function like() {
    if (real && !user) return router.push("/login");
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    if (!real) return;
    const { error } = next
      ? await supabase!.from("post_likes").insert({ post_id: post.id, user_id: user!.id })
      : await supabase!.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user!.id);
    if (error) {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
  }

  async function comment(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (!real) {
      setComments((c) => [...c, { id: String(Date.now()), body, created_at: new Date().toISOString(), author: getPerson(user?.id ?? "") ?? people[0] }]);
      return setDraft("");
    }
    if (!user) return router.push("/login");
    setBusy(true);
    const { data, error } = await supabase!.from("post_comments").insert({ post_id: post.id, user_id: user.id, body }).select("id, created_at").single();
    setBusy(false);
    if (error || !data) return;
    setComments((c) => [...c, { id: data.id, body, created_at: data.created_at, author: getPerson(user.id) ?? author }]);
    setDraft("");
  }

  async function remove() {
    if (!real || !supabase) return;
    setBusy(true);
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (!error) {
      const paths = (post.media ?? []).map((u) => u.split("/object/public/posts/")[1]).filter(Boolean);
      if (paths.length) await supabase.storage.from("posts").remove(paths);
      router.push("/");
    }
    setBusy(false);
  }

  const mine = !!user && user.id === post.authorId;

  return (
    <div className="mx-auto mt-[30px] grid max-w-[1000px] overflow-hidden rounded-card bg-surface md:grid-cols-[minmax(0,1fr)_360px]">
      <Media post={post} />
      <div className="flex min-h-[420px] flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Link href={`/profile/${author.id}`}>
            <Avatar person={author} size={42} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${author.id}`} className="block truncate text-[15px] font-bold hover:text-primary">
              {author.name}
            </Link>
            {post.createdAt && <p className="text-xs font-semibold text-muted">{ago(post.createdAt)} ago</p>}
          </div>
          {mine ? (
            <button onClick={remove} disabled={busy} aria-label="Delete post" className="text-muted hover:text-live">
              <Trash2 className="size-5" />
            </button>
          ) : (
            <FollowToggle personId={author.id} />
          )}
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 md:max-h-[460px]">
          {post.caption && <p className="whitespace-pre-line text-[14px] leading-relaxed">{post.caption}</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar person={c.author} size={32} />
              <div className="min-w-0">
                <p className="text-[13px]">
                  <Link href={`/profile/${c.author.id}`} className="font-bold hover:text-primary">{c.author.name}</Link> {c.body}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-muted">{ago(c.created_at)}</p>
              </div>
            </div>
          ))}
          {!post.caption && !comments.length && <p className="text-[13px] font-semibold text-muted">No comments yet. Be the first!</p>}
        </div>
        <div className="border-t border-line px-5 py-3">
          <div className="flex items-center gap-5 text-[13px] font-bold text-muted">
            <button onClick={like} aria-pressed={liked} className={`flex items-center gap-1.5 ${liked ? "text-primary" : "hover:text-primary"}`}>
              <ThumbsUp className={`size-5 ${liked ? "fill-primary" : ""}`} /> {likes}
            </button>
            <span className="flex items-center gap-1.5"><MessageSquareText className="size-5" /> {real ? comments.length : post.comments + comments.length}</span>
            <span className="flex items-center gap-1.5"><Eye className="size-5" /> {post.views + (real ? 1 : 0)}</span>
          </div>
          <form onSubmit={comment} className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder={real && !user ? "Log in to comment" : "Add a comment…"}
              aria-label="Add a comment"
              className="h-10 min-w-0 flex-1 rounded-[10px] bg-bg px-3 text-[13px] font-semibold outline-none placeholder:text-muted"
            />
            <button disabled={busy || !draft.trim()} className="h-10 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-white disabled:opacity-50">
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
