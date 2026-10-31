"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ClassCard } from "@/components/class-card";
import { PostTile } from "@/components/post-tile";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Card } from "@/components/ui";
import type { Post, Session } from "@/lib/data";
import { registerSessionRow, type PlaceRow, type SessionRow } from "@/lib/live-data";
import { postSelect, toPost, type PostRow } from "@/lib/posts";
import { supabase, type Profile } from "@/lib/supabase";

export function PlacePage({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [place, setPlace] = useState<(PlaceRow & { owner: Profile | null }) | null | undefined>(undefined);
  const [tab, setTab] = useState<"classes" | "posts">("classes");
  const [classes, setClasses] = useState<Session[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return setPlace(null);
      const { data } = await supabase!.from("places").select("*, owner:profiles!places_owner_id_fkey(*)").eq("id", id).maybeSingle();
      const p = data as (PlaceRow & { owner: Profile | null }) | null;
      setPlace(p);
      if (!p) return;
      // Sessions linked to the place, or held within about 150 m of it.
      let q = supabase!.from("sessions").select("*, koach:profiles!sessions_koach_id_fkey(*)").eq("status", "scheduled").gte("ends_at", new Date(Date.now() - 3600_000).toISOString()).order("starts_at").limit(40);
      q = p.lat != null && p.lng != null
        ? q.or(`place_id.eq.${id},and(lat.gte.${p.lat - 0.0015},lat.lte.${p.lat + 0.0015},lng.gte.${p.lng - 0.002},lng.lte.${p.lng + 0.002})`)
        : q.eq("place_id", id);
      const [{ data: s }, { data: po }, { data: f }] = await Promise.all([
        q,
        supabase!.from("posts").select(postSelect).eq("place_id", id).order("created_at", { ascending: false }).limit(60),
        supabase!.from("place_follows").select("user_id").eq("place_id", id),
      ]);
      setClasses(((s ?? []) as SessionRow[]).map(registerSessionRow));
      setPosts(((po ?? []) as PostRow[]).map(toPost));
      setFollowers((f ?? []).map((r) => r.user_id as string));
    })();
  }, [id]);

  if (place === undefined) return <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[13px] font-semibold text-muted">Loading…</Card>;
  if (!place) return <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[15px] font-bold">Location not found</Card>;

  const following = !!user && followers.includes(user.id);
  async function follow() {
    if (!supabase) return;
    if (!user) return router.push("/login");
    setFollowers((l) => (following ? l.filter((x) => x !== user.id) : [...l, user.id]));
    const { error } = following
      ? await supabase.from("place_follows").delete().eq("place_id", id).eq("user_id", user.id)
      : await supabase.from("place_follows").insert({ place_id: id, user_id: user.id });
    if (error) setFollowers((l) => (following ? [...l, user.id] : l.filter((x) => x !== user.id)));
  }

  return (
    <div className="mx-auto mt-[30px] max-w-[1000px] space-y-[30px]">
      <Card className="overflow-hidden">
        {place.photo ? <img src={place.photo} alt="" className="h-[240px] w-full object-cover" /> : <div className="grid h-[160px] place-items-center bg-primary-soft text-primary"><MapPin className="size-10" /></div>}
        <div className="flex flex-wrap items-start gap-5 p-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-extrabold">{place.name}</h1>
            <p className="mt-1 text-[13px] font-semibold text-muted">{place.address}{place.address && " · "}{place.indoor ? "Indoor" : "Outdoor"} · {followers.length} {followers.length === 1 ? "follower" : "followers"}</p>
            {place.description && <p className="mt-3 max-w-[620px] text-[13px] leading-[1.6] text-muted">{place.description}</p>}
            {place.owner && (
              <Link href={`/profile/${place.owner.id}`} className="mt-3 flex items-center gap-2 text-[12px] font-bold text-muted hover:text-primary">
                <ProfileAvatar profile={place.owner} size={22} /> Listed by {place.owner.name}
              </Link>
            )}
          </div>
          <div className="flex gap-3">
            {place.lat != null && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`} target="_blank" rel="noreferrer" className="flex h-10 items-center rounded-[10px] bg-bg px-4 text-[13px] font-bold text-primary">Directions</a>
            )}
            <button onClick={follow} className={`h-10 rounded-[10px] px-5 text-[13px] font-bold ${following ? "bg-primary-soft text-primary" : "bg-primary text-white"}`}>{following ? "Following" : "Follow"}</button>
          </div>
        </div>
      </Card>
      <div className="flex h-[70px] items-center justify-center gap-6 rounded-card bg-surface" role="tablist">
        {(["classes", "posts"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-11 w-[130px] rounded-[12px] text-[13px] font-bold capitalize ${tab === t ? "bg-primary text-white" : "text-muted hover:text-primary"}`}>{t}</button>
        ))}
      </div>
      {tab === "classes" ? (
        classes.length ? <div className="grid gap-[30px] sm:grid-cols-2 lg:grid-cols-3">{classes.map((s) => <ClassCard key={s.id} session={s} />)}</div> : <Card className="py-12 text-center text-[13px] font-semibold text-muted">No upcoming classes here yet.</Card>
      ) : posts.length ? (
        <div className="grid grid-cols-3 gap-[15px] max-sm:gap-2">{posts.map((p) => <PostTile key={p.id} post={p} w={300} h={300} className="aspect-square" />)}</div>
      ) : (
        <Card className="py-12 text-center text-[13px] font-semibold text-muted">No posts tagged here yet.</Card>
      )}
    </div>
  );
}
