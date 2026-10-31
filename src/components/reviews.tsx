"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { ago } from "@/components/comments";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Card } from "@/components/ui";
import { supabase, type Profile } from "@/lib/supabase";

type Review = { id: string; rating: number; body: string; created_at: string; reviewer: Profile };

export function Stars({ value, size = 14, onPick }: { value: number; size?: number; onPick?: (n: number) => void }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star style={{ width: size, height: size }} className={n <= Math.round(value) ? "fill-yellow text-yellow" : "text-line"} />;
        return onPick ? <button key={n} type="button" aria-label={`${n} stars`} onClick={() => onPick(n)}>{icon}</button> : <span key={n}>{icon}</span>;
      })}
    </span>
  );
}

export function useReviews(koachId: string, enabled: boolean) {
  const [list, setList] = useState<Review[]>([]);
  useEffect(() => {
    if (!supabase || !enabled) return;
    supabase
      .from("reviews")
      .select("id, rating, body, created_at, reviewer:profiles!reviews_reviewer_id_fkey(*)")
      .eq("koach_id", koachId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setList((data ?? []) as unknown as Review[]));
  }, [koachId, enabled]);
  const avg = list.length ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10 : 0;
  return { list, avg };
}

// The Koach's reviews, written by people who booked their sessions.
export function ReviewsCard({ koachId }: { koachId: string }) {
  const { list, avg } = useReviews(koachId, true);
  return (
    <Card className="px-[25px] py-[22px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">Reviews</h2>
        {list.length > 0 && <span className="flex items-center gap-1.5 text-[13px] font-bold"><Stars value={avg} /> {avg} ({list.length})</span>}
      </div>
      {list.length ? (
        <ul className="mt-4 space-y-4">
          {list.slice(0, 5).map((r) => (
            <li key={r.id} className="flex gap-3">
              <Link href={`/profile/${r.reviewer.id}`}><ProfileAvatar profile={r.reviewer} size={32} /></Link>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[13px] font-bold">{r.reviewer.name} <Stars value={r.rating} size={11} /></p>
                {r.body && <p className="mt-0.5 text-[12px] leading-snug text-muted">{r.body}</p>}
                <p className="mt-0.5 text-[11px] font-semibold text-muted">{ago(r.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] font-semibold text-muted">No reviews yet. People who book a session can leave one.</p>
      )}
    </Card>
  );
}
