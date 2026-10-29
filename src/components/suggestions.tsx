"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card, CardHeader, FollowerStack, PersonRow } from "@/components/ui";
import { currentUserId, getPerson, people, showSamples, type Person } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

// Real accounts you don't follow yet (Koaches first), topped up with the sample people.
function useSuggestions(count: number, koachesOnly: boolean) {
  const { user } = useAuth();
  const [real, setReal] = useState<Person[]>([]);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    (async () => {
      const followed = user ? ((await supabase!.from("follows").select("followee_id").eq("follower_id", user.id)).data ?? []).map((f) => f.followee_id as string) : [];
      let q = supabase!.from("profiles").select("*").order("role", { ascending: false }).order("created_at", { ascending: false }).limit(count + followed.length + 1);
      if (koachesOnly) q = q.in("role", ["koach", "prokoach"]);
      const { data } = await q;
      const list = ((data as Profile[] | null) ?? []).filter((p) => p.id !== user?.id && !followed.includes(p.id));
      list.forEach(registerProfile);
      if (alive) setReal(list.slice(0, count).map((p) => getPerson(p.id)!));
    })();
    return () => {
      alive = false;
    };
  }, [user, count, koachesOnly]);
  const demo = people.filter((p) => showSamples && !p.real && p.id !== currentUserId && (!koachesOnly || p.role !== "member"));
  return [...real, ...demo].slice(0, count);
}

export function FollowSuggestions() {
  const list = useSuggestions(5, false);
  return (
    <Card className="pb-[15px]">
      <CardHeader title="Follow Suggestions" href="/search?q=a" />
      <ul className="mt-[13px] space-y-[5px] px-[15px]">
        {list.map((p) => (
          <PersonRow key={p.id} person={p} sub={p.real ? p.bio?.slice(0, 30) || "New on ZeeKoach" : <FollowerStack />} />
        ))}
      </ul>
    </Card>
  );
}

export function KoachesNearBy() {
  const list = useSuggestions(7, true);
  return (
    <Card className="pb-[15px]">
      <CardHeader title="Koaches near by" href="/map" />
      <ul className="mt-[13px] space-y-[5px] px-[15px]">
        {list.map((p) => (
          <PersonRow key={p.id} person={p} sub={p.real ? "Koach" : `${p.distanceKm}km`} />
        ))}
      </ul>
    </Card>
  );
}
