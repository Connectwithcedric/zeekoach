"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCheck, Settings, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Avatar, Card } from "@/components/ui";
import { getPerson } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

type Note = { id: string; kind: string; actor_id: string | null; target: string; text: string; read_at: string | null; created_at: string; actor: Profile | null };

export const noteGroups = [
  { key: "social", label: "Follows", kinds: ["follow"] },
  { key: "likes", label: "Likes", kinds: ["like"] },
  { key: "comments", label: "Comments, replies and tags", kinds: ["comment", "tag", "review"] },
  { key: "sessions", label: "Bookings, classes and live", kinds: ["booking", "session", "live"] },
  { key: "challenges", label: "Challenges", kinds: ["challenge"] },
  { key: "money", label: "Money, tips and gifts", kinds: ["money", "tip", "gift"] },
] as const;

const filters = [{ key: "all", label: "All" }, { key: "unread", label: "Unread" }, ...noteGroups.map((g) => ({ key: g.key, label: g.label.split(",")[0] }))];

const when = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Every notification, with filters, mark all read and clear read ones.
export function NotificationsPage() {
  const { ready, user } = useAuth();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    supabase
      .from("notifications")
      .select("id, kind, actor_id, target, text, read_at, created_at, actor:profiles!notifications_actor_id_fkey(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data }) => {
        const list = (data ?? []) as unknown as Note[];
        list.forEach((n) => n.actor && registerProfile(n.actor));
        if (alive) setNotes(list);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (ready && !user)
    return (
      <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[13px] font-semibold text-muted">
        <Link href="/login" className="font-bold text-primary">Log in</Link> to see your notifications.
      </Card>
    );

  const group = noteGroups.find((g) => g.key === filter);
  const shown = (notes ?? []).filter((n) => (filter === "unread" ? !n.read_at : group ? (group.kinds as readonly string[]).includes(n.kind) : true));

  async function readAll() {
    const now = new Date().toISOString();
    setNotes((l) => l?.map((n) => (n.read_at ? n : { ...n, read_at: now })) ?? l);
    await supabase!.from("notifications").update({ read_at: now }).eq("user_id", user!.id).is("read_at", null);
  }
  async function clearRead() {
    setNotes((l) => l?.filter((n) => !n.read_at) ?? l);
    await supabase!.from("notifications").delete().eq("user_id", user!.id).not("read_at", "is", null);
  }
  async function open(n: Note) {
    if (n.read_at) return;
    const now = new Date().toISOString();
    setNotes((l) => l?.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)) ?? l);
    await supabase!.from("notifications").update({ read_at: now }).eq("id", n.id);
  }

  return (
    <div className="mx-auto mt-[30px] max-w-[720px] space-y-[20px]">
      <Card className="flex flex-wrap items-center justify-between gap-3 px-[25px] py-[18px]">
        <h1 className="text-[19px] font-bold">Notifications</h1>
        <span className="flex gap-2">
          <button onClick={readAll} className="flex h-9 items-center gap-1.5 rounded-[10px] bg-bg px-3 text-[12px] font-bold text-primary"><CheckCheck className="size-4" /> Mark all read</button>
          <button onClick={clearRead} className="flex h-9 items-center gap-1.5 rounded-[10px] bg-bg px-3 text-[12px] font-bold text-muted hover:text-live"><Trash2 className="size-4" /> Clear read</button>
          <Link href="/settings/notifications" aria-label="Notification settings" className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-muted hover:text-primary"><Settings className="size-4" /></Link>
        </span>
        <div className="flex w-full flex-wrap gap-2">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`h-8 rounded-full px-3 text-[12px] font-bold ${filter === f.key ? "bg-primary text-white" : "bg-bg text-muted hover:text-ink"}`}>{f.label}</button>
          ))}
        </div>
      </Card>
      <Card className="py-2">
        {notes === null ? (
          <p className="py-12 text-center text-[13px] font-semibold text-muted">Loading…</p>
        ) : !shown.length ? (
          <p className="py-12 text-center text-[13px] font-semibold text-muted">Nothing here.</p>
        ) : (
          <ul>
            {shown.map((n) => {
              const actor = n.actor_id ? getPerson(n.actor_id) : undefined;
              return (
                <li key={n.id}>
                  <Link href={n.target || "/"} onClick={() => open(n)} className={`flex items-center gap-3 px-[25px] py-3 hover:bg-bg ${n.read_at ? "" : "bg-primary-soft/40"}`}>
                    {actor ? <Avatar person={actor} size={40} /> : <span className="size-10 rounded-[12px] bg-primary-soft" />}
                    <span className="min-w-0 flex-1 text-[13px] leading-snug">
                      <b>{n.actor_id ? (actor?.name ?? "Someone") : "zKoach"}</b> {n.text}
                      <span className="block text-[11px] font-semibold text-muted">{when(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
