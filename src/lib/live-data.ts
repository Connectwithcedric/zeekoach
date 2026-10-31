"use client";

import { useEffect, useState } from "react";
import { getLocation, registerLocation, registerPerson, registerSession, type PhotoKey, type Session } from "@/lib/data";
import { supabase, type Profile } from "@/lib/supabase";

export type SessionRow = {
  id: string;
  koach_id: string;
  title: string;
  description: string;
  equipment: string;
  format: "in-person" | "stream";
  pricing: "per-person" | "private";
  price: number;
  starts_at: string;
  ends_at: string;
  age_min: number;
  indoor: boolean;
  capacity: number;
  booked: number;
  image: string;
  location_name: string;
  address: string;
  meet_up: string;
  lat: number | null;
  lng: number | null;
  series_id?: string | null;
  status?: "scheduled" | "cancelled";
  koach: Profile | null;
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function registerProfile(p: Profile) {
  registerPerson({
    id: p.id,
    name: p.name || "New member",
    role: p.role,
    photo: "coach",
    avatarUrl: p.avatar_url,
    username: p.username,
    verified: p.role === "prokoach",
    real: true,
    distanceKm: 0,
    rating: 0,
    reviews: 0,
    followers: 0,
    following: 0,
    subscribers: 0,
    bio: p.bio,
  });
}

// Turns a database row into the shape the screens already use, and registers it.
export function registerSessionRow(r: SessionRow): Session {
  if (r.koach) registerProfile(r.koach);
  const start = new Date(r.starts_at);
  // Sessions at the same place share one map pin.
  const locationId = r.lat != null && r.lng != null ? `loc-${r.lat.toFixed(4)},${r.lng.toFixed(4)}` : `loc-${r.id}`;
  // A listed place keeps its own name and photo; sessions there just join it.
  if (!getLocation(locationId)?.listed) registerLocation({
    id: locationId,
    name: r.location_name || (r.format === "stream" ? "Online" : "Location to be confirmed"),
    followers: 0,
    address: r.address,
    meetUp: r.meet_up,
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    rating: 0,
    reviews: 0,
    real: true,
  });
  const session: Session = {
    id: r.id,
    title: r.title,
    koachId: r.koach_id,
    format: r.format,
    pricing: r.pricing,
    price: Number(r.price),
    day: Math.round((midnight(start) - midnight(new Date())) / 86_400_000),
    start: hhmm(start),
    end: hhmm(new Date(r.ends_at)),
    ageMin: r.age_min,
    indoor: r.indoor,
    attendees: r.booked,
    capacity: r.capacity,
    likes: 0,
    rating: 0,
    reviews: 0,
    image: r.image as PhotoKey,
    description: r.description,
    equipment: r.equipment,
    locationId,
    real: true,
    seriesId: r.series_id ?? r.id,
    cancelled: r.status === "cancelled",
    startsAt: r.starts_at,
  };
  registerSession(session);
  return session;
}

const select = "*, koach:profiles!sessions_koach_id_fkey(*)";

export type PlaceRow = { id: string; owner_id: string; name: string; address: string; description: string; indoor: boolean; photo: string | null; lat: number | null; lng: number | null };

// Same id scheme as session places, so sessions at a listed place share its pin.
export const placeLocationId = (p: { id: string; lat: number | null; lng: number | null }) => (p.lat != null && p.lng != null ? `loc-${p.lat.toFixed(4)},${p.lng.toFixed(4)}` : `place-${p.id}`);

export function registerPlace(p: PlaceRow) {
  registerLocation({
    id: placeLocationId(p),
    name: p.name,
    followers: 0,
    address: p.address,
    meetUp: "",
    lat: p.lat ?? 0,
    lng: p.lng ?? 0,
    rating: 0,
    reviews: 0,
    real: true,
    listed: true,
    photo: p.photo,
    ownerId: p.owner_id,
    description: p.description,
    indoor: p.indoor,
  });
}

async function loadPlaces() {
  const { data } = await supabase!.from("places").select("*").order("created_at", { ascending: false }).limit(200);
  (data as PlaceRow[] | null)?.forEach(registerPlace);
}

let pending: Promise<void> | null = null;
function loadUpcoming() {
  if (!supabase) return Promise.resolve();
  pending ??= (async () => {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { data } = await supabase!.from("sessions").select(select).gte("ends_at", since).eq("status", "scheduled").order("starts_at").limit(200);
    await loadPlaces();
    (data as SessionRow[] | null)?.forEach(registerSessionRow);
  })();
  return pending;
}

export function reloadSessions() {
  pending = null;
  return loadUpcoming();
}

// Loads upcoming real sessions once per page load. The returned number changes when they arrive.
export function useLiveSessions() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    loadUpcoming().then(() => alive && setVersion((v) => v + 1));
    return () => {
      alive = false;
    };
  }, []);
  return version;
}

export async function fetchSession(id: string): Promise<Session | null> {
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase.from("sessions").select(select).eq("id", id).maybeSingle();
  return data ? registerSessionRow(data as SessionRow) : null;
}

// Ids of sessions the signed-in user has a confirmed booking for.
export function useMyBookingIds(userId: string | undefined) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (!supabase || !userId) return;
    let alive = true;
    supabase
      .from("bookings")
      .select("session_id")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .then(({ data }) => alive && setIds((data ?? []).map((b) => b.session_id as string)));
    return () => {
      alive = false;
    };
  }, [userId]);
  return ids;
}

// A real session by id, for pages whose id isn't in the demo data. Undefined while loading, null if missing.
export function useFetchedSession(id: string) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    fetchSession(id).then((s) => alive && setSession(s));
    return () => {
      alive = false;
    };
  }, [id]);
  return session;
}
