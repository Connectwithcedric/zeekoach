"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Gift credit left: gift cards received minus what confirmed bookings used. Mirrors giftCredit() on the server.
export function useGiftCredit(userId: string | undefined) {
  const [credit, setCredit] = useState(0);
  useEffect(() => {
    const db = supabase;
    if (!db || !userId) return;
    let alive = true;
    Promise.all([
      db.from("gift_cards").select("amount").eq("recipient_id", userId),
      db.from("bookings").select("credit_used").eq("user_id", userId).eq("status", "confirmed"),
    ]).then(([g, b]) => {
      const got = (g.data ?? []).reduce((n, r) => n + Number(r.amount), 0);
      const used = (b.data ?? []).reduce((n, r) => n + Number(r.credit_used), 0);
      if (alive) setCredit(Math.max(0, Math.round((got - used) * 100) / 100));
    });
    return () => {
      alive = false;
    };
  }, [userId]);
  return credit;
}
