"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, Hash, MapPin, Search } from "lucide-react";
import { PostTile } from "@/components/post-tile";
import { Avatar, Card } from "@/components/ui";
import { formatPrice, getPerson, people, roleLabel, sessions as demoSessions, showSamples, type Person, type Post, type Session } from "@/lib/data";
import { registerProfile, registerSessionRow, type SessionRow } from "@/lib/live-data";
import { postSelect, toPost, type PostRow } from "@/lib/posts";
import { supabase, type Profile } from "@/lib/supabase";

const clean = (q: string) => q.replace(/[%,()]/g, "").trim();

type Place = { id: string; name: string; address: string; photo: string | null };
type FoundChallenge = { id: string; rule: string; media_a: string };
type Found = { people: Person[]; sessions: Session[]; posts: Post[]; tags: { tag: string; posts: number }[]; places: Place[]; challenges: FoundChallenge[] };
type Tab = "all" | "community" | "classes" | "tags" | "locations" | "challenges";
const tabs: [Tab, string][] = [["all", "All"], ["community", "Community"], ["classes", "Classes"], ["tags", "Tags"], ["locations", "Locations"], ["challenges", "Challenges"]];

// Search like the old app: community, classes, tags, locations and challenges, plus posts.
export function SearchResults() {
  const router = useRouter();
  const q = useSearchParams().get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [found, setFound] = useState<Found | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    const term = clean(q);
    const lower = term.toLowerCase();
    const demo = {
      people: people.filter((p) => showSamples && !p.real && p.name.toLowerCase().includes(lower)),
      sessions: demoSessions.filter((s) => showSamples && !s.real && s.title.toLowerCase().includes(lower)),
    };
    if (!term) return;
    let alive = true;
    (async () => {
      if (!supabase) return alive && setFound({ ...demo, posts: [], tags: [], places: [], challenges: [] });
      const like = `%${term}%`;
      const [ps, ss, po, tg, pl, ch] = await Promise.all([
        supabase.from("profiles").select("*").or(`name.ilike.${like},username.ilike.${like},city.ilike.${like}`).limit(20),
        supabase.from("sessions").select("*, koach:profiles!sessions_koach_id_fkey(*)").or(`title.ilike.${like},location_name.ilike.${like},description.ilike.${like}`).gte("ends_at", new Date().toISOString()).eq("status", "scheduled").order("starts_at").limit(20),
        supabase.from("posts").select(postSelect).ilike("caption", like).order("created_at", { ascending: false }).limit(12),
        supabase.rpc("search_hashtags", { q: term.replace(/^#/, "") }),
        supabase.from("places").select("id, name, address, photo").or(`name.ilike.${like},address.ilike.${like}`).limit(12),
        supabase.from("challenges").select("id, rule, media_a").eq("status", "live").ilike("rule", like).order("created_at", { ascending: false }).limit(12),
      ]);
      (ps.data as Profile[] | null)?.forEach(registerProfile);
      const realPeople = ((ps.data as Profile[] | null) ?? []).map((p) => getPerson(p.id)!).filter(Boolean);
      const realSessions = ((ss.data as SessionRow[] | null) ?? []).map(registerSessionRow);
      const realPosts = ((po.data as PostRow[] | null) ?? []).map(toPost);
      if (alive)
        setFound({
          people: [...realPeople, ...demo.people],
          sessions: [...realSessions, ...demo.sessions],
          posts: realPosts,
          tags: ((tg.data ?? []) as { tag: string; posts: number }[]),
          places: (pl.data ?? []) as Place[],
          challenges: (ch.data ?? []) as FoundChallenge[],
        });
    })();
    return () => {
      alive = false;
    };
  }, [q]);

  const results = q.trim() ? found : null;
  const empty = results && !results.people.length && !results.sessions.length && !results.posts.length && !results.tags.length && !results.places.length && !results.challenges.length;
  const show = (t: Tab) => tab === "all" || tab === t;

  return (
    <div className="mx-auto mt-[30px] max-w-[760px] space-y-[25px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) router.push(`/search?q=${encodeURIComponent(draft.trim())}`);
        }}
        className="flex h-[54px] items-center gap-3 rounded-card bg-surface px-5"
      >
        <Search className="size-5 text-muted" aria-hidden />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus placeholder="Search people, classes, #tags, places and challenges" aria-label="Search" className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-muted" />
      </form>

      {q.trim() && (
        <div className="flex gap-2 overflow-x-auto rounded-card bg-surface p-2" role="tablist">
          {tabs.map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-10 shrink-0 rounded-[12px] px-4 text-[13px] font-bold ${tab === t ? "bg-primary text-white" : "text-muted hover:text-primary"}`}>{label}</button>
          ))}
        </div>
      )}

      {!q.trim() ? null : !results ? (
        <p className="text-center text-[13px] font-semibold text-muted">Searching…</p>
      ) : empty ? (
        <Card className="py-12 text-center text-[13px] font-semibold text-muted">Nothing found for “{q}”.</Card>
      ) : (
        <>
          {show("community") && results.people.length > 0 && (
            <Card className="px-[15px] py-[15px]">
              <h2 className="px-[10px] text-[15px] font-bold">People</h2>
              <ul className="mt-2">
                {results.people.map((p) => (
                  <li key={p.id}>
                    <Link href={`/profile/${p.id}`} className="flex items-center gap-3 rounded-[14px] px-[10px] py-[8px] hover:bg-bg">
                      <Avatar person={p} size={42} />
                      <span>
                        <span className="block text-[14px] font-bold">{p.name}</span>
                        <span className="text-xs font-semibold text-muted">{roleLabel[p.role]}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {show("classes") && results.sessions.length > 0 && (
            <Card className="px-[15px] py-[15px]">
              <h2 className="px-[10px] text-[15px] font-bold">Sessions</h2>
              <ul className="mt-2">
                {results.sessions.map((s) => {
                  const k = getPerson(s.koachId);
                  return (
                    <li key={s.id}>
                      <Link href={`/sessions/${s.id}`} className="flex items-center gap-3 rounded-[14px] px-[10px] py-[8px] hover:bg-bg">
                        {k && <Avatar person={k} size={42} />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-bold">{s.title}</span>
                          <span className="text-xs font-semibold text-muted">{k?.name} · {s.start}-{s.end}</span>
                        </span>
                        <span className="text-[13px] font-bold text-yellow">{formatPrice(s.price)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          {show("tags") && results.tags.length > 0 && (
            <Card className="px-[15px] py-[15px]">
              <h2 className="px-[10px] text-[15px] font-bold">Tags</h2>
              <ul className="mt-2">
                {results.tags.map((t) => (
                  <li key={t.tag}>
                    <Link href={`/tags/${t.tag}`} className="flex items-center gap-3 rounded-[14px] px-[10px] py-[8px] hover:bg-bg">
                      <span className="grid size-[42px] place-items-center rounded-[12px] bg-primary-soft text-primary"><Hash className="size-5" /></span>
                      <span><span className="block text-[14px] font-bold">#{t.tag}</span><span className="text-xs font-semibold text-muted">{t.posts} posts</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {show("locations") && results.places.length > 0 && (
            <Card className="px-[15px] py-[15px]">
              <h2 className="px-[10px] text-[15px] font-bold">Locations</h2>
              <ul className="mt-2">
                {results.places.map((pl) => (
                  <li key={pl.id}>
                    <Link href={`/places/${pl.id}`} className="flex items-center gap-3 rounded-[14px] px-[10px] py-[8px] hover:bg-bg">
                      {pl.photo ? <img src={pl.photo} alt="" className="size-[42px] rounded-[12px] object-cover" /> : <span className="grid size-[42px] place-items-center rounded-[12px] bg-bg text-primary"><MapPin className="size-5" /></span>}
                      <span className="min-w-0"><span className="block truncate text-[14px] font-bold">{pl.name}</span><span className="block truncate text-xs font-semibold text-muted">{pl.address}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {show("challenges") && results.challenges.length > 0 && (
            <Card className="px-[15px] py-[15px]">
              <h2 className="px-[10px] text-[15px] font-bold">Challenges</h2>
              <ul className="mt-2">
                {results.challenges.map((c) => (
                  <li key={c.id}>
                    <Link href="/challenges" className="flex items-center gap-3 rounded-[14px] px-[10px] py-[8px] hover:bg-bg">
                      <span className="grid size-[42px] place-items-center rounded-[12px] bg-primary-soft text-primary"><Award className="size-5" /></span>
                      <span className="text-[14px] font-bold">{c.rule}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {show("all") && results.posts.length > 0 && (
            <div>
              <h2 className="mb-3 text-[15px] font-bold">Posts</h2>
              <div className="grid grid-cols-3 gap-[15px] max-sm:gap-2">
                {results.posts.map((p) => (
                  <PostTile key={p.id} post={p} w={240} h={240} className="aspect-square" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
