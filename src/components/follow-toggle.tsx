"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

const uuid = /^[0-9a-f-]{36}$/;

// Follow / Following. Real accounts are saved in the database; demo people only toggle on screen.
export function FollowToggle({ personId, variant = "link", onChange }: { personId: string; variant?: "link" | "button"; onChange?: (following: boolean) => void }) {
  const { user } = useAuth();
  const real = uuid.test(personId) && !!supabase;
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!real || !user) return;
    let alive = true;
    supabase!
      .from("follows")
      .select("followee_id")
      .eq("follower_id", user.id)
      .eq("followee_id", personId)
      .maybeSingle()
      .then(({ data }) => alive && setFollowing(!!data));
    return () => {
      alive = false;
    };
  }, [real, user, personId]);

  const cls =
    variant === "button"
      ? `flex h-[38px] items-center justify-center rounded-[10px] text-[13px] font-bold ${following ? "bg-bg text-primary hover:bg-primary-soft" : "bg-primary text-white hover:bg-primary-strong"}`
      : "text-xs font-bold text-primary hover:underline";

  if (user?.id === personId) return null;
  if (real && !user)
    return (
      <Link href="/login" className={cls}>
        Follow
      </Link>
    );

  async function toggle() {
    const next = !following;
    if (real && user) {
      setBusy(true);
      const { error } = next
        ? await supabase!.from("follows").insert({ follower_id: user.id, followee_id: personId })
        : await supabase!.from("follows").delete().eq("follower_id", user.id).eq("followee_id", personId);
      setBusy(false);
      if (error) return;
    }
    setFollowing(next);
    onChange?.(next);
  }

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={following} className={cls}>
      {following ? "Following" : "Follow"}
    </button>
  );
}

// Follower and following counts for a real account.
export async function followCounts(id: string) {
  if (!supabase) return { followers: 0, following: 0 };
  const [a, b] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
  ]);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}
