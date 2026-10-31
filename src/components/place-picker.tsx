"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export type PickedPlace = { id: string; name: string; address: string; lat: number | null; lng: number | null };

// Pick one listed place (gym, studio, park), e.g. to tag where a post was taken.
export function PlacePicker({ value, onChange, placeholder = "Add a location" }: { value: PickedPlace | null; onChange: (p: PickedPlace | null) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PickedPlace[]>([]);
  useEffect(() => {
    const term = q.trim().replace(/[%,()]/g, "");
    if (!supabase || term.length < 2) return;
    const t = setTimeout(async () => {
      const { data } = await supabase!.from("places").select("id, name, address, lat, lng").or(`name.ilike.%${term}%,address.ilike.%${term}%`).limit(8);
      setHits((data ?? []) as PickedPlace[]);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (value)
    return (
      <span className="flex h-11 items-center gap-2 rounded-[12px] bg-primary-soft px-4 text-[13px] font-bold text-primary">
        <MapPin className="size-4" /> <span className="min-w-0 flex-1 truncate">{value.name}</span>
        <button type="button" aria-label="Remove location" onClick={() => onChange(null)}><X className="size-4" /></button>
      </span>
    );
  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
      {q.trim().length >= 2 && hits.length > 0 && (
        <ul className="absolute inset-x-0 top-12 z-20 overflow-hidden rounded-[12px] bg-surface shadow-[0_10px_30px_rgba(25,26,30,0.12)]">
          {hits.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { onChange(p); setQ(""); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg">
                <MapPin className="size-4 shrink-0 text-primary" />
                <span className="min-w-0"><span className="block truncate text-[13px] font-bold">{p.name}</span><span className="block truncate text-[11px] font-semibold text-muted">{p.address}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
