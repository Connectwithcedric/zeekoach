"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PostTile } from "@/components/post-tile";
import { Avatar, Card } from "@/components/ui";
import { formatPrice, getPerson, people, roleLabel, sessions as demoSessions, showSamples, type Person, type Post, type Session } from "@/lib/data";
import { registerProfile, registerSessionRow, type SessionRow } from "@/lib/live-data";
import { postSelect, toPost, type PostRow } from "@/lib/posts";
import { supabase, type Profile } from "@/lib/supabase";

const clean = (q: string) => q.replace(/[%,()]/g, "").trim();

// People, sessions and posts matching the search box in the top bar.
export function SearchResults() {
  const router = useRouter();
  const q = useSearchParams().get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [found, setFound] = useState<{ people: Person[]; sessions: Session[]; posts: Post[] } | null>(null);

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
      if (!supabase) return alive && setFound({ ...demo, posts: [] });
      const like = `%${term}%`;
      const [ps, ss, po] = await Promise.all([
        supabase.from("profiles").select("*").or(`name.ilike.${like},username.ilike.${like},city.ilike.${like}`).limit(20),
        supabase.from("sessions").select("*, koach:profiles!sessions_koach_id_fkey(*)").or(`title.ilike.${like},location_name.ilike.${like},description.ilike.${like}`).gte("ends_at", new Date().toISOString()).order("starts_at").limit(20),
        supabase.from("posts").select(postSelect).ilike("caption", like).order("created_at", { ascending: false }).limit(12),
      ]);
      (ps.data as Profile[] | null)?.forEach(registerProfile);
      const realPeople = ((ps.data as Profile[] | null) ?? []).map((p) => getPerson(p.id)!).filter(Boolean);
      const realSessions = ((ss.data as SessionRow[] | null) ?? []).map(registerSessionRow);
      const realPosts = ((po.data as PostRow[] | null) ?? []).map(toPost);
      if (alive) setFound({ people: [...realPeople, ...demo.people], sessions: [...realSessions, ...demo.sessions], posts: realPosts });
    })();
    return () => {
      alive = false;
    };
  }, [q]);

  const results = q.trim() ? found : null;
  const empty = results && !results.people.length && !results.sessions.length && !results.posts.length;

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
        <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus placeholder="Search people, sessions and posts" aria-label="Search" className="w-full bg-transparent text-[15px] font-semibold outline-none placeholder:text-muted" />
      </form>

      {!q.trim() ? null : !results ? (
        <p className="text-center text-[13px] font-semibold text-muted">Searching…</p>
      ) : empty ? (
        <Card className="py-12 text-center text-[13px] font-semibold text-muted">Nothing found for “{q}”.</Card>
      ) : (
        <>
          {results.people.length > 0 && (
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
          {results.sessions.length > 0 && (
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
          {results.posts.length > 0 && (
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
