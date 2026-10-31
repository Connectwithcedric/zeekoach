"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { Stars } from "@/components/reviews";
import { Card, Photo } from "@/components/ui";
import { api } from "@/lib/api";
import { formatPrice, type PhotoKey } from "@/lib/data";
import type { SessionRow } from "@/lib/live-data";
import { supabase } from "@/lib/supabase";

type Booking = { guests: number; total: number; status: "confirmed" | "cancelled"; session: SessionRow };
type Tab = "upcoming" | "completed" | "canceled";

const when = (r: SessionRow) => new Date(r.starts_at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// The old app's Bookings: upcoming (cancel), completed (review the Koach) and canceled.
export function Bookings() {
  const { ready, user } = useAuth();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [list, setList] = useState<Booking[] | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<Booking | null>(null);
  const [asking, setAsking] = useState<{ b: Booking; refund: boolean } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supabase || !user) return;
    supabase
      .from("bookings")
      .select("guests, total, status, session:sessions(*, koach:profiles!sessions_koach_id_fkey(*))")
      .eq("user_id", user.id)
      .then(({ data }) => setList(((data ?? []) as unknown as Booking[]).filter((b) => b.session).sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at))));
    supabase.from("reviews").select("session_id").eq("reviewer_id", user.id).then(({ data }) => setReviewed(new Set((data ?? []).map((r) => r.session_id as string))));
  }, [user]);

  if (ready && !user)
    return (
      <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center">
        <p className="text-[15px] font-bold">Log in to see your bookings</p>
        <Link href="/login" className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">Log in</Link>
      </Card>
    );

  const now = new Date().toISOString();
  const shown = (list ?? []).filter((b) =>
    tab === "canceled" ? b.status === "cancelled" || b.session.status === "cancelled" : b.status === "confirmed" && b.session.status !== "cancelled" && (tab === "upcoming" ? b.session.ends_at >= now : b.session.ends_at < now),
  );
  if (tab !== "upcoming") shown.reverse();

  async function cancel(b: Booking) {
    setAsking(null);
    const r = await api<{ refunded?: boolean }>("/api/bookings/cancel", { sessionId: b.session.id });
    if (r.error) return setMsg(r.error);
    setMsg(r.refunded ? "Booking cancelled. Your money is on its way back." : "Booking cancelled. It was less than 24 hours before the start, so there's no refund.");
    setList((l) => l?.map((x) => (x === b ? { ...x, status: "cancelled" } : x)) ?? null);
  }

  return (
    <div className="mx-auto mt-[30px] max-w-[760px] space-y-[30px]">
      <div className="flex h-[70px] items-center justify-around rounded-card bg-surface px-6" role="tablist">
        {(["upcoming", "completed", "canceled"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-11 w-[130px] rounded-[12px] text-[13px] font-bold capitalize ${tab === t ? "bg-primary text-white" : "text-muted hover:text-primary"}`}>
            {t}
          </button>
        ))}
      </div>
      {msg && <p className="rounded-[12px] bg-primary-soft px-4 py-3 text-[13px] font-semibold text-primary">{msg}</p>}
      <Card className="px-[25px] py-[10px]">
        {list === null ? (
          <p className="py-10 text-center text-[13px] font-semibold text-muted">Loading…</p>
        ) : !shown.length ? (
          <div className="py-12 text-center">
            <p className="text-[15px] font-bold">No {tab} bookings</p>
            {tab === "upcoming" && <Link href="/sessions" className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">Find a session</Link>}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((b) => (
              <li key={b.session.id} className="flex items-center gap-4 py-[15px]">
                <Photo k={b.session.image as PhotoKey} w={56} h={56} className="size-14 shrink-0 rounded-[12px]" />
                <Link href={`/sessions/${b.session.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold hover:text-primary">{b.session.title}</span>
                  <span className="mt-1 block text-[13px] font-semibold text-muted">{when(b.session)} · {b.session.location_name || "Online"}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-muted">
                    with {b.session.koach?.name || "your Koach"} · {b.guests} {b.guests === 1 ? "spot" : "spots"} · <span className="font-bold text-yellow">{formatPrice(Number(b.total))}</span>
                    {b.session.status === "cancelled" && <span className="font-bold text-live"> · Cancelled by the Koach, refunded</span>}
                  </span>
                </Link>
                {tab === "upcoming" && <button onClick={() => setAsking({ b, refund: new Date(b.session.starts_at).getTime() - Date.now() > 86_400_000 })} className="h-9 w-[90px] rounded-[10px] bg-bg text-[13px] font-bold text-live">Cancel</button>}
                {tab === "completed" &&
                  (reviewed.has(b.session.id) ? (
                    <span className="text-[12px] font-bold text-muted">Reviewed</span>
                  ) : (
                    <button onClick={() => setReviewing(b)} className="h-9 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-white">Review</button>
                  ))}
                {tab === "canceled" && b.session.ends_at >= now && b.session.status !== "cancelled" && (
                  <Link href={`/book/${b.session.id}`} className="flex h-9 items-center rounded-[10px] bg-bg px-4 text-[13px] font-bold text-primary">Book again</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {asking && (
        <Modal label="Cancel booking" onClose={() => setAsking(null)}>
          <div className="w-[380px] max-w-full rounded-[10px] bg-surface p-7 text-center">
            <h2 className="text-[15px] font-bold">Cancel “{asking.b.session.title}”?</h2>
            <p className="mt-2 text-[13px] font-semibold text-muted">
              {asking.refund
                ? "You'll get your money back, since it's more than 24 hours before the start."
                : "It starts in less than 24 hours, so there's no refund."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setAsking(null)} className="h-10 rounded-[10px] bg-bg text-[13px] font-bold">Keep it</button>
              <button onClick={() => cancel(asking.b)} className="h-10 rounded-[10px] bg-live text-[13px] font-bold text-white">Cancel booking</button>
            </div>
          </div>
        </Modal>
      )}
      {reviewing && user && (
        <ReviewForm
          booking={reviewing}
          userId={user.id}
          onClose={() => setReviewing(null)}
          onDone={() => {
            setReviewed((s) => new Set(s).add(reviewing.session.id));
            setReviewing(null);
            setMsg("Thanks for your review!");
          }}
        />
      )}
    </div>
  );
}

function ReviewForm({ booking, userId, onClose, onDone }: { booking: Booking; userId: string; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  async function send() {
    if (!supabase) return;
    const { error } = await supabase.from("reviews").insert({ reviewer_id: userId, koach_id: booking.session.koach_id, session_id: booking.session.id, rating, body: body.trim() });
    if (error) return setError(error.message);
    onDone();
  }
  return (
    <Modal label="Review" onClose={onClose}>
      <div className="w-[400px] max-w-full rounded-[10px] bg-surface p-7">
        <h2 className="text-center text-[15px] font-bold">How was {booking.session.koach?.name || "your Koach"}?</h2>
        <p className="mt-1 text-center text-[12px] font-semibold text-muted">{booking.session.title}</p>
        <div className="mt-5 flex justify-center"><Stars value={rating} size={30} onPick={setRating} /></div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} placeholder="Tell others about the session (optional)" className="mt-5 w-full resize-none rounded-[12px] bg-bg px-4 py-3 text-[13px] font-semibold outline-none placeholder:text-muted" />
        {error && <p className="mt-2 text-[12px] font-semibold text-live">{error}</p>}
        <button disabled={!rating} onClick={send} className="mt-5 h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:bg-[#d9d2ff]">Send review</button>
      </div>
    </Modal>
  );
}
