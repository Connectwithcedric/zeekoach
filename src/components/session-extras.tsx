"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ShareToChat } from "@/components/share-to-chat";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";
import type { Session } from "@/lib/data";
import { supabase, type Profile } from "@/lib/supabase";

type Attendee = { guests: number; user: Profile };

// Next to a real session: the other dates of its class, and for the Koach the people who booked and a Cancel button.
export function SessionExtras({ session }: { session: Session }) {
  const { user } = useAuth();
  const mine = user?.id === session.koachId;
  const [dates, setDates] = useState<{ id: string; starts_at: string; booked: number; capacity: number }[]>([]);
  const [people, setPeople] = useState<Attendee[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [cancelled, setCancelled] = useState(!!session.cancelled);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);

  // A stream session that's live right now: the people who booked can join it here.
  useEffect(() => {
    if (!supabase || session.format !== "stream") return;
    let alive = true;
    supabase
      .from("streams")
      .select("id")
      .eq("session_id", session.id)
      .is("ended_at", null)
      .gt("seen_at", new Date(Date.now() - 90_000).toISOString())
      .limit(1)
      .then(({ data }) => alive && setLiveId(data?.[0]?.id ?? null));
    return () => {
      alive = false;
    };
  }, [session.id, session.format]);

  useEffect(() => {
    if (!supabase || !session.seriesId) return;
    supabase
      .from("sessions")
      .select("id, starts_at, booked, capacity")
      .eq("series_id", session.seriesId)
      .eq("status", "scheduled")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(12)
      .then(({ data }) => setDates(data ?? []));
  }, [session.seriesId]);

  useEffect(() => {
    if (!supabase || !mine) return;
    supabase
      .from("bookings")
      .select("guests, user:profiles!bookings_user_id_fkey(*)")
      .eq("session_id", session.id)
      .eq("status", "confirmed")
      .then(({ data }) => setPeople((data ?? []) as unknown as Attendee[]));
  }, [mine, session.id]);

  async function cancel() {
    setBusy(true);
    const r = await api<{ refunded?: number }>("/api/sessions/cancel", { sessionId: session.id });
    setBusy(false);
    setAsking(false);
    if (r.error) return setMsg(r.error);
    setCancelled(true);
    setMsg(r.refunded ? `Session cancelled. ${r.refunded} ${r.refunded === 1 ? "person was" : "people were"} refunded and told.` : "Session cancelled.");
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-full max-w-[410px] space-y-[20px] lg:w-[320px]">
      {cancelled && <p className="rounded-[12px] bg-[#fdecee] px-4 py-3 text-[13px] font-bold text-live">This session was cancelled. Everyone who booked was refunded.</p>}
      {msg && !cancelled && <p className="rounded-[12px] bg-primary-soft px-4 py-3 text-[13px] font-semibold text-primary">{msg}</p>}
      {!cancelled && session.format === "stream" && (liveId ? (
        <Link href={`/live/${liveId}`} className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-live text-[13px] font-bold text-white">
          <span className="size-2 animate-pulse rounded-full bg-white" /> {mine ? "Back to your stream" : "Join the live stream"}
        </Link>
      ) : mine ? (
        <Link href={`/live/new?session=${session.id}`} className="flex h-11 w-full items-center justify-center rounded-[12px] bg-primary text-[13px] font-bold text-white">Start the stream</Link>
      ) : null)}
      {!cancelled && <ShareToChat type="session" id={session.id} className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-surface text-[13px] font-bold text-primary hover:bg-primary-soft" />}
      {session.seriesId && (
        <Card className="px-[22px] py-[20px]">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-bold"><CalendarDays className="size-4 text-primary" /> Class dates</h2>
            <Link href={`/classes/${session.seriesId}`} className="text-xs font-bold text-primary">Class page</Link>
          </div>
          {dates.length ? (
            <ul className="mt-3 space-y-1">
              {dates.map((d) => (
                <li key={d.id}>
                  <Link href={`/sessions/${d.id}`} className={`flex justify-between rounded-[10px] px-3 py-2 text-[13px] font-semibold ${d.id === session.id ? "bg-primary-soft text-primary" : "hover:bg-bg"}`}>
                    {fmt(d.starts_at)}
                    <span className="text-muted">{d.capacity - d.booked > 0 ? `${d.capacity - d.booked} left` : "Full"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] font-semibold text-muted">No upcoming dates.</p>
          )}
        </Card>
      )}
      {mine && (
        <Card className="px-[22px] py-[20px]">
          <h2 className="text-[15px] font-bold">Who&apos;s coming</h2>
          {people === null ? (
            <p className="mt-3 text-[13px] font-semibold text-muted">Loading…</p>
          ) : people.length ? (
            <ul className="mt-3 space-y-2">
              {people.map((a) => (
                <li key={a.user.id}>
                  <Link href={`/profile/${a.user.id}`} className="flex items-center gap-3 text-[13px] font-bold hover:text-primary">
                    <ProfileAvatar profile={a.user} size={32} /> {a.user.name}
                    {a.guests > 1 && <span className="font-semibold text-muted">+{a.guests - 1}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[13px] font-semibold text-muted">No bookings yet.</p>
          )}
          {!cancelled && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href={`/sessions/new?edit=${session.id}`} className="flex h-10 items-center justify-center rounded-[10px] bg-bg text-[13px] font-bold text-primary">Edit</Link>
              <button onClick={() => setAsking(true)} className="h-10 rounded-[10px] bg-bg text-[13px] font-bold text-live">Cancel session</button>
            </div>
          )}
        </Card>
      )}
      {asking && (
        <Modal label="Cancel session" onClose={() => setAsking(false)}>
          <div className="w-[380px] max-w-full rounded-[10px] bg-surface p-7 text-center">
            <h2 className="text-[15px] font-bold">Cancel “{session.title}”?</h2>
            <p className="mt-2 text-[13px] font-semibold text-muted">Everyone who booked gets a full refund and a notification.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setAsking(false)} className="h-10 rounded-[10px] bg-bg text-[13px] font-bold">Keep it</button>
              <button disabled={busy} onClick={cancel} className="h-10 rounded-[10px] bg-live text-[13px] font-bold text-white disabled:opacity-60">{busy ? "Cancelling…" : "Cancel session"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
