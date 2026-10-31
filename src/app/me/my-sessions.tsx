"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Card, Photo } from "@/components/ui";
import { registerSessionRow, type SessionRow } from "@/lib/live-data";
import { formatPrice, type PhotoKey } from "@/lib/data";
import { supabase } from "@/lib/supabase";

type Item = { row: SessionRow; guests?: number };

const when = (r: SessionRow) =>
  new Date(r.starts_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Koaches see the sessions they run; members see the sessions they booked.
export function MySessions({ userId, isKoach }: { userId: string; isKoach: boolean }) {
  const [items, setItems] = useState<Item[] | null>(supabase ? null : []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const since = new Date(Date.now() - 86_400_000).toISOString();
    (async () => {
      if (isKoach) {
        const { data } = await supabase!.from("sessions").select("*, koach:profiles!sessions_koach_id_fkey(*)").eq("koach_id", userId).gte("ends_at", since).order("starts_at");
        if (alive) setItems(((data ?? []) as SessionRow[]).map((row) => ({ row })));
      } else {
        const { data } = await supabase!
          .from("bookings")
          .select("guests, session:sessions(*, koach:profiles!sessions_koach_id_fkey(*))")
          .eq("user_id", userId)
          .eq("status", "confirmed");
        const list = ((data ?? []) as unknown as { guests: number; session: SessionRow | null }[])
          .filter((b) => b.session && b.session.ends_at >= since)
          .map((b) => ({ row: b.session!, guests: b.guests }))
          .sort((a, b) => a.row.starts_at.localeCompare(b.row.starts_at));
        if (alive) setItems(list);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, isKoach]);

  async function cancel(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("session_id", id).eq("user_id", userId);
    if (!error) setItems((list) => list?.filter((i) => i.row.id !== id) ?? null);
  }

  const heading = isKoach ? "Your sessions" : "Your bookings";

  if (items && !items.length)
    return (
      <Card className="px-8 py-14 text-center">
        <h2 className="text-[17px] font-bold">{heading}</h2>
        <p className="mx-auto mt-2 max-w-[380px] text-[13px] font-semibold text-muted">
          {isKoach ? "Create your first session so members can find and book you." : "Sessions you book will show up here."}
        </p>
        <Link href={isKoach ? "/sessions/new" : "/sessions"} className="mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">
          <CalendarPlus className="size-4" /> {isKoach ? "Create a session" : "Find a session"}
        </Link>
      </Card>
    );

  return (
    <Card className="px-[25px] pb-[15px] pt-[21px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">{heading}</h2>
        <Link href={isKoach ? "/sessions/new" : "/sessions"} className="text-xs font-bold text-primary">
          {isKoach ? "+ New session" : "Find more"}
        </Link>
      </div>
      {!items ? (
        <p className="py-10 text-center text-[13px] font-semibold text-muted">Loading…</p>
      ) : (
        <ul className="mt-[10px] divide-y divide-line">
          {items.map(({ row, guests }) => {
            registerSessionRow(row);
            return (
              <li key={row.id} className="flex items-center gap-4 py-[15px]">
                <Photo k={row.image as PhotoKey} w={50} h={50} className="size-[50px] shrink-0 rounded-[12px]" />
                <Link href={`/sessions/${row.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold hover:text-primary">{row.title}</span>
                  <span className="mt-1 block text-[13px] font-semibold text-muted">
                    {when(row)}
                    <span className="mx-2 inline-block size-[3px] rounded-full bg-muted align-middle" />
                    <span className="font-bold text-yellow">{formatPrice(Number(row.price))}</span>
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold text-muted">
                    {isKoach ? `${row.booked} of ${row.capacity} booked` : `${guests} ${guests === 1 ? "spot" : "spots"} · with ${row.koach?.name || "your Koach"}`}
                  </span>
                </Link>
                {isKoach ? (
                  <Link href={`/sessions/new?edit=${row.id}`} className="flex h-9 w-[90px] items-center justify-center rounded-[10px] bg-bg text-[13px] font-bold text-primary">
                    Edit
                  </Link>
                ) : (
                  <button onClick={() => cancel(row.id)} className="h-9 w-[90px] rounded-[10px] bg-bg text-[13px] font-bold text-live">
                    Cancel
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
