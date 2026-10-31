"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, MapPin, Swords, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Card = { href: string; title: string; sub: string; image?: string | null };

// Loads what a chat message shares (a post, session, class, place, profile or challenge) as a small card.
async function load(type: string, id: string): Promise<Card | null> {
  const db = supabase!;
  const day = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  if (type === "post") {
    const { data } = await db.from("posts").select("id, media, kind, caption, author:profiles!posts_author_id_fkey(name)").eq("id", id).maybeSingle();
    if (!data) return null;
    const d = data as unknown as { id: string; media: string[]; kind: string; caption: string; author: { name: string } | null };
    return { href: `/post/${d.id}`, title: d.author?.name ?? "Post", sub: d.caption || (d.kind === "video" ? "Video" : "Photo"), image: d.kind === "video" ? null : d.media[0] };
  }
  if (type === "session" || type === "class") {
    const q = db.from("sessions").select("id, series_id, title, starts_at, location_name").order("starts_at").limit(1);
    const { data } = await (type === "class" ? q.eq("series_id", id) : q.eq("id", id)).maybeSingle();
    if (!data) return null;
    return { href: type === "class" ? `/classes/${data.series_id}` : `/sessions/${data.id}`, title: data.title, sub: `${type === "class" ? "Class · " : ""}${day(data.starts_at)}${data.location_name ? ` · ${data.location_name}` : ""}` };
  }
  if (type === "place") {
    const { data } = await db.from("places").select("id, name, address, photo").eq("id", id).maybeSingle();
    return data ? { href: `/places/${data.id}`, title: data.name, sub: data.address, image: data.photo } : null;
  }
  if (type === "profile") {
    const { data } = await db.from("profiles").select("id, name, username, avatar_url, role").eq("id", id).maybeSingle();
    return data ? { href: `/profile/${data.id}`, title: data.name, sub: data.username ? `@${data.username}` : data.role, image: data.avatar_url } : null;
  }
  if (type === "challenge") {
    const { data } = await db.from("challenges").select("id, rule, status").eq("id", id).maybeSingle();
    return data ? { href: `/challenges?c=${data.id}`, title: data.rule, sub: `Challenge · ${data.status}` } : null;
  }
  return null;
}

const icons = { session: CalendarClock, class: CalendarClock, place: MapPin, profile: UserRound, challenge: Swords } as const;

export function SharedCard({ type, id }: { type: string; id: string }) {
  const [card, setCard] = useState<Card | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    load(type, id).then((c) => alive && setCard(c));
    return () => {
      alive = false;
    };
  }, [type, id]);
  if (card === undefined) return <span className="block h-[64px] w-[240px] animate-pulse rounded-[12px] bg-bg" />;
  if (!card) return <span className="block rounded-[12px] border border-line px-3 py-2 text-[12px] font-semibold italic text-muted">This {type} is no longer available</span>;
  const Icon = icons[type as keyof typeof icons];
  return (
    <Link href={card.href} className="flex w-[260px] max-w-full items-center gap-3 overflow-hidden rounded-[12px] border border-line bg-surface p-2 hover:border-primary">
      {card.image ? (
        <img src={card.image} alt="" className="size-12 shrink-0 rounded-[8px] object-cover" />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-primary-soft text-primary">{Icon ? <Icon className="size-5" /> : null}</span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-ink">{card.title}</span>
        <span className="line-clamp-2 text-[11px] font-semibold text-muted">{card.sub}</span>
      </span>
    </Link>
  );
}
