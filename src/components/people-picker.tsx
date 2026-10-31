"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { supabase, type Profile } from "@/lib/supabase";

// Search real accounts by name or username and pick several, e.g. to tag people in a post.
export function PeoplePicker({ value, onChange, exclude = [], placeholder = "Search people" }: { value: Profile[]; onChange: (p: Profile[]) => void; exclude?: string[]; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Profile[]>([]);
  useEffect(() => {
    const term = q.trim().replace(/[%,()]/g, "");
    if (!supabase || term.length < 2) return;
    const t = setTimeout(async () => {
      const { data } = await supabase!.from("profiles").select("*").or(`name.ilike.%${term}%,username.ilike.%${term}%`).limit(8);
      setHits(((data ?? []) as Profile[]).filter((p) => !exclude.includes(p.id) && !value.some((v) => v.id === p.id)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, value, exclude]);

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pl-1 pr-2 text-[12px] font-bold text-primary">
              <ProfileAvatar profile={p} size={20} /> {p.name}
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((v) => v.id !== p.id))}><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
        {q.trim().length >= 2 && hits.length > 0 && (
          <ul className="absolute inset-x-0 top-12 z-20 overflow-hidden rounded-[12px] bg-surface shadow-[0_10px_30px_rgba(25,26,30,0.12)]">
            {hits.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => { onChange([...value, p]); setQ(""); setHits([]); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg">
                  <ProfileAvatar profile={p} size={30} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold">{p.name}</span>
                    {p.username && <span className="block text-[11px] font-semibold text-muted">@{p.username}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
