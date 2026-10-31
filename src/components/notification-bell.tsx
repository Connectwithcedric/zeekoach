"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Avatar } from "@/components/ui";
import { getPerson } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

type Note = { id: string; actor_id: string | null; target: string; text: string; read_at: string | null; created_at: string; actor: Profile | null };

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const select = "id, actor_id, target, text, read_at, created_at, actor:profiles!notifications_actor_id_fkey(*)";

// The bell in the top bar: your latest notifications, live, with an unread count.
export function NotificationBell() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    const keep = (list: Note[]) => {
      list.forEach((n) => n.actor && registerProfile(n.actor));
      return list;
    };
    supabase
      .from("notifications")
      .select(select)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => alive && setNotes(keep((data ?? []) as unknown as Note[])));
    const channel = supabase
      .channel(`notes-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, async (payload) => {
        const { data } = await supabase!.from("notifications").select(select).eq("id", (payload.new as Note).id).maybeSingle();
        if (alive && data) setNotes((list) => [...keep([data as unknown as Note]), ...list.filter((n) => n.id !== (data as unknown as Note).id)]);
      })
      .subscribe();
    return () => {
      alive = false;
      supabase!.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unread = notes.filter((n) => !n.read_at).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread && supabase && user) {
      const now = new Date().toISOString();
      setNotes((list) => list.map((n) => (n.read_at ? n : { ...n, read_at: now })));
      await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    }
  }

  return (
    <div ref={box} className="relative">
      <button onClick={toggle} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} aria-expanded={open} className="relative text-[#7c7c8a] hover:text-primary">
        <Bell className="size-[19px]" strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-live px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-[320px] overflow-hidden rounded-[16px] bg-surface shadow-[0_10px_40px_rgba(25,26,30,0.15)]">
          <p className="border-b border-line px-4 py-3 text-[15px] font-bold">Notifications</p>
          {!user ? (
            <p className="px-4 py-6 text-center text-[13px] font-semibold text-muted">
              <Link href="/login" className="font-bold text-primary">Log in</Link> to see your notifications.
            </p>
          ) : !notes.length ? (
            <p className="px-4 py-6 text-center text-[13px] font-semibold text-muted">Nothing yet. Follows, bookings, likes and challenges show up here.</p>
          ) : (
            <ul className="max-h-[400px] overflow-y-auto py-1">
              {notes.map((n) => {
                const actor = n.actor_id ? getPerson(n.actor_id) : undefined;
                return (
                  <li key={n.id}>
                    <Link href={n.target || "/"} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg">
                      {actor && <Avatar person={actor} size={36} />}
                      <span className="min-w-0 flex-1 text-[13px] leading-snug">
                        <b>{n.actor_id ? (actor?.name ?? "Someone") : "zKoach"}</b> {n.text}
                        <span className="block text-[11px] font-semibold text-muted">{ago(n.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
