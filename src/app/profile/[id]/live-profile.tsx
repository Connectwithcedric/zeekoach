"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { followCounts } from "@/components/follow-toggle";
import { registerProfile, registerSessionRow, type SessionRow } from "@/lib/live-data";
import { getPerson, type Person, type Session } from "@/lib/data";
import { supabase, type Profile } from "@/lib/supabase";
import { ProfileView } from "./profile-view";

export function LiveProfile({ id }: { id: string }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ person: Person; sessions: Session[] } | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    (async () => {
      const { data: profile } = await supabase!.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!profile) return alive && setState(null);
      registerProfile(profile as Profile);
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const [{ data: rows }, counts, { data: ratings }] = await Promise.all([
        supabase!.from("sessions").select("*, koach:profiles!sessions_koach_id_fkey(*)").eq("koach_id", id).gte("ends_at", since).order("starts_at"),
        followCounts(id),
        supabase!.from("reviews").select("rating").eq("koach_id", id),
      ]);
      const stars = (ratings ?? []).map((r) => r.rating as number);
      const rating = stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10 : 0;
      const sessions = ((rows ?? []) as SessionRow[]).map(registerSessionRow);
      if (alive) setState({ person: { ...getPerson(id)!, ...counts, rating, reviews: stars.length }, sessions });
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (!state)
    return (
      <div className="mx-auto mt-[30px] max-w-[440px] rounded-card bg-surface px-8 py-12 text-center">
        {state === undefined ? (
          <p className="text-[13px] font-semibold text-muted">Loading profile…</p>
        ) : (
          <>
            <h1 className="text-[17px] font-bold">Profile not found</h1>
            <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">Go home</Link>
          </>
        )}
      </div>
    );

  return (
    <ProfileView
      person={state.person}
      theirSessions={state.sessions}
      isOwner={user?.id === id}
      onFollow={(f) => setState((s) => s && { ...s, person: { ...s.person, followers: s.person.followers + (f ? 1 : -1) } })}
    />
  );
}
