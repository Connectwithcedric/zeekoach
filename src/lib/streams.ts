"use client";

import { useEffect, useState } from "react";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

export type Stream = { id: string; host_id: string; title: string; started_at: string; ended_at: string | null; seen_at: string; session_id?: string | null; host: Profile | null };

export const streamSelect = "*, host:profiles!streams_host_id_fkey(*)";

// A stream counts as live while its host's browser keeps checking in.
const freshSince = () => new Date(Date.now() - 90_000).toISOString();

const keep = (list: Stream[]) => {
  list.forEach((s) => s.host && registerProfile(s.host));
  return list;
};

async function fetchLive() {
  if (!supabase) return [];
  const { data } = await supabase.from("streams").select(streamSelect).is("ended_at", null).gt("seen_at", freshSince()).order("started_at", { ascending: false }).limit(20);
  return keep((data as Stream[] | null) ?? []);
}

export async function fetchStream(id: string) {
  if (!supabase) return null;
  const { data } = await supabase.from("streams").select(streamSelect).eq("id", id).maybeSingle();
  return data ? keep([data as Stream])[0] : null;
}

export const isLive = (s: Stream) => !s.ended_at && Date.parse(s.seen_at) > Date.now() - 90_000;

// Everyone streaming right now, kept up to date as people go live or stop.
export function useLiveStreams() {
  const [list, setList] = useState<Stream[]>([]);
  useEffect(() => {
    const db = supabase;
    if (!db) return;
    let alive = true;
    const load = () => fetchLive().then((l) => alive && setList(l));
    load();
    const ch = db
      .channel("streams-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "streams" }, load)
      .subscribe();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
      db.removeChannel(ch);
    };
  }, []);
  return list;
}
