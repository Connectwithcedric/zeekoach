"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BellOff, Heart } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ago } from "@/components/comments";
import { ProfileAvatar } from "@/components/profile-avatar";
import { RichText } from "@/components/rich-text";
import { Card, Photo } from "@/components/ui";
import { formatPrice, type PhotoKey } from "@/lib/data";
import type { SessionRow } from "@/lib/live-data";
import { useToday } from "@/lib/use-today";
import { supabase, type Profile } from "@/lib/supabase";

type CComment = { id: string; parent_id: string | null; body: string; created_at: string; author: Profile };

export function ClassPage({ series }: { series: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [dates, setDates] = useState<SessionRow[] | null>(null);
  const [likes, setLikes] = useState<string[]>([]);
  const [follows, setFollows] = useState<string[]>([]);
  const [comments, setComments] = useState<CComment[]>([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<CComment | null>(null);
  const today = useToday();

  useEffect(() => {
    if (!supabase) return;
    supabase.from("sessions").select("*, koach:profiles!sessions_koach_id_fkey(*)").eq("series_id", series).order("starts_at").then(({ data }) => setDates((data ?? []) as SessionRow[]));
    supabase.from("class_likes").select("user_id").eq("series_id", series).then(({ data }) => setLikes((data ?? []).map((r) => r.user_id as string)));
    supabase.from("class_follows").select("user_id").eq("series_id", series).then(({ data }) => setFollows((data ?? []).map((r) => r.user_id as string)));
    supabase
      .from("class_comments")
      .select("id, parent_id, body, created_at, author:profiles!class_comments_user_id_fkey(*)")
      .eq("series_id", series)
      .order("created_at")
      .then(({ data }) => setComments((data ?? []) as unknown as CComment[]));
  }, [series]);

  if (dates === null) return <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[13px] font-semibold text-muted">Loading class…</Card>;
  const first = dates[0];
  if (!first) return <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[15px] font-bold">Class not found</Card>;

  async function toggle(table: "class_likes" | "class_follows", list: string[], set: (l: string[]) => void) {
    if (!supabase) return;
    if (!user) return router.push("/login");
    const on = list.includes(user.id);
    set(on ? list.filter((x) => x !== user.id) : [...list, user.id]);
    const { error } = on
      ? await supabase.from(table).delete().eq("series_id", series).eq("user_id", user.id)
      : await supabase.from(table).insert({ series_id: series, user_id: user.id });
    if (error) set(list);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!user) return router.push("/login");
    const body = draft.trim();
    if (!body) return;
    const parent_id = replyTo ? replyTo.parent_id ?? replyTo.id : null;
    const { data, error } = await supabase.from("class_comments").insert({ series_id: series, user_id: user.id, body, parent_id }).select("id, parent_id, body, created_at, author:profiles!class_comments_user_id_fkey(*)").single();
    if (error || !data) return;
    setComments((c) => [...c, data as unknown as CComment]);
    setDraft("");
    setReplyTo(null);
  }

  const now = today ? new Date().toISOString() : "";
  const upcoming = dates.filter((d) => d.ends_at >= now && d.status !== "cancelled");
  const liked = !!user && likes.includes(user.id);
  const followed = !!user && follows.includes(user.id);
  const row = (c: CComment, reply: boolean) => (
    <div key={c.id} className={`flex gap-3 ${reply ? "ml-11 mt-3" : "mt-4"}`}>
      <ProfileAvatar profile={c.author} size={reply ? 26 : 32} />
      <div className="min-w-0">
        <p className="text-[13px]"><Link href={`/profile/${c.author.id}`} className="font-bold hover:text-primary">{c.author.name}</Link> <RichText text={c.body} /></p>
        <p className="mt-0.5 flex gap-3 text-[11px] font-semibold text-muted">{ago(c.created_at)} <button onClick={() => setReplyTo(c)} className="font-bold hover:text-ink">Reply</button></p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto mt-[30px] grid max-w-[1000px] gap-[30px] lg:grid-cols-[1fr_360px]">
      <div className="space-y-[30px]">
        <Card className="overflow-hidden">
          <Photo k={first.image as PhotoKey} w={640} h={260} className="h-[260px] w-full" />
          <div className="p-6">
            <h1 className="text-[22px] font-extrabold">{first.title}</h1>
            {first.koach && (
              <Link href={`/profile/${first.koach.id}`} className="mt-2 flex items-center gap-2 text-[13px] font-bold hover:text-primary">
                <ProfileAvatar profile={first.koach} size={28} /> {first.koach.name}
              </Link>
            )}
            <p className="mt-3 text-[13px] font-semibold text-muted">
              {first.format === "stream" ? "Stream" : first.location_name} · <span className="font-bold text-yellow">{formatPrice(Number(first.price))}</span> {first.pricing === "private" ? "private session" : "per person"}
            </p>
            {first.description && <p className="mt-4 text-[13px] leading-[1.6] text-muted">{first.description}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => toggle("class_likes", likes, setLikes)} aria-pressed={liked} className={`flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold ${liked ? "bg-[#fdecee] text-live" : "bg-bg text-ink"}`}>
                <Heart className={`size-4 ${liked ? "fill-live" : ""}`} /> {likes.length}
              </button>
              <button onClick={() => toggle("class_follows", follows, setFollows)} aria-pressed={followed} className={`flex h-10 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold ${followed ? "bg-primary-soft text-primary" : "bg-primary text-white"}`}>
                {followed ? <BellOff className="size-4" /> : <Bell className="size-4" />} {followed ? "Following" : "Follow class"}
              </button>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-muted">Followers hear when new dates are added.</p>
          </div>
        </Card>
        <Card className="px-6 py-5">
          <h2 className="text-[15px] font-bold">Comments</h2>
          {comments.filter((c) => !c.parent_id).map((c) => (
            <div key={c.id}>
              {row(c, false)}
              {comments.filter((r) => r.parent_id === c.id).map((r) => row(r, true))}
            </div>
          ))}
          {!comments.length && <p className="mt-3 text-[13px] font-semibold text-muted">No comments yet. Ask the Koach a question!</p>}
          {replyTo && <p className="mt-4 text-[12px] font-semibold text-muted">Replying to {replyTo.author.name} · <button onClick={() => setReplyTo(null)} className="font-bold">cancel</button></p>}
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder={user ? "Add a comment…" : "Log in to comment"} className="h-10 min-w-0 flex-1 rounded-[10px] bg-bg px-3 text-[13px] font-semibold outline-none placeholder:text-muted" />
            <button disabled={!draft.trim()} className="h-10 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-white disabled:opacity-50">Post</button>
          </form>
        </Card>
      </div>
      <Card className="h-fit px-[22px] py-[20px]">
        <h2 className="text-[15px] font-bold">Upcoming dates</h2>
        {upcoming.length ? (
          <ul className="mt-3 space-y-2">
            {upcoming.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-bg px-3 py-2.5">
                <span className="text-[13px] font-bold">
                  {new Date(d.starts_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  <span className="block text-[11px] font-semibold text-muted">{d.capacity - d.booked > 0 ? `${d.capacity - d.booked} spots left` : "Full"}</span>
                </span>
                {d.capacity - d.booked > 0 && user?.id !== d.koach_id && <Link href={`/book/${d.id}`} className="flex h-8 items-center rounded-[8px] bg-primary px-3 text-[12px] font-bold text-white">Book</Link>}
                {user?.id === d.koach_id && <Link href={`/sessions/${d.id}`} className="text-[12px] font-bold text-primary">Manage</Link>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] font-semibold text-muted">No upcoming dates. Follow the class to hear about new ones.</p>
        )}
      </Card>
    </div>
  );
}
