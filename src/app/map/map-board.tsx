"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, CalendarClock, MessageCircle, Navigation, Search, SlidersHorizontal, Star } from "lucide-react";
import { Photo } from "@/components/ui";
import { formatPrice, locations, sessions } from "@/lib/data";

// Leaflet touches `window`, so the map only renders in the browser.
const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false, loading: () => <div className="size-full animate-pulse bg-[#e9e9f1]" /> });

const actions = ["Enroll", "Buy", "Visit"] as const;

export function MapBoard() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(locations[0].id);
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const shown = locations.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()));
  const prices = sessions
    .filter((s) => s.format === "in-person" && (!indoorOnly || s.indoor))
    .map((s) => ({ id: s.id, label: formatPrice(s.price), loc: locations.find((l) => l.id === s.locationId)! }));

  return (
    <div className="relative mt-[30px] overflow-hidden rounded-card bg-surface">
      <div className="relative h-[calc(100vh-330px)] min-h-[420px]">
        <LeafletMap locations={shown} prices={prices} selected={selected} onSelect={setSelected} />
        <div className="absolute left-5 top-5 z-[500] flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filters"
            className={`flex size-11 items-center justify-center rounded-[12px] shadow ${showFilters ? "bg-primary text-white" : "bg-white text-ink"}`}
          >
            <SlidersHorizontal className="size-5" />
          </button>
          <label className="flex h-11 w-[220px] items-center gap-2 rounded-[12px] bg-white px-4 text-[13px] shadow">
            <Search className="size-4 text-muted" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full bg-transparent font-semibold outline-none placeholder:text-muted" />
          </label>
        </div>
        {showFilters && (
          <div className="absolute left-5 top-20 z-[500] w-[260px] rounded-[16px] bg-white p-4 shadow-lg">
            <p className="text-[13px] font-bold">Filters</p>
            <label className="mt-3 flex items-center justify-between text-[13px] font-semibold text-[#55555f]">
              Indoor sessions only
              <input type="checkbox" checked={indoorOnly} onChange={(e) => setIndoorOnly(e.target.checked)} className="size-4 accent-primary" />
            </label>
          </div>
        )}
      </div>

      <ul className="flex gap-[15px] overflow-x-auto bg-bg p-[15px]">
        {shown.map((l, i) => {
          const action = actions[i % actions.length];
          const active = l.id === selected;
          return (
            <li key={l.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected(l.id)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(l.id)}
                className={`w-[235px] cursor-pointer rounded-[16px] bg-surface p-[16px] ${active ? "outline outline-2 outline-[#3d8bff]" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <Photo k="gymInterior" w={40} h={40} className="size-10 rounded-[8px]" />
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Directions"
                    onClick={(e) => e.stopPropagation()}
                    className="flex size-7 items-center justify-center rounded-[6px] bg-[#7a7a85] text-white"
                  >
                    <Navigation className="size-3.5 rotate-45" />
                  </a>
                </div>
                <p className="mt-3 flex items-center gap-1.5 truncate text-[13px] font-bold">
                  {l.name}
                  {l.verified && <BadgeCheck className="size-4 shrink-0 fill-[#3d8bff] text-white" aria-label="Verified" />}
                </p>
                <p className="mt-1.5 flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1"><Star className="size-3.5 fill-yellow text-yellow" /> {l.rating} <span className="font-semibold text-muted">({l.reviews})</span></span>
                  <span>{(1.2 + i * 0.6).toFixed(1)}km</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/sessions"
                    className={`flex h-9 flex-1 items-center justify-center rounded-[10px] text-xs font-bold ${action === "Visit" ? "bg-bg text-primary" : "bg-primary text-white"}`}
                  >
                    {action}
                  </Link>
                  <Link href="/sessions" aria-label="Sessions here" className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-primary"><CalendarClock className="size-4" /></Link>
                  <Link href="/chat" aria-label="Message" className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-primary"><MessageCircle className="size-4" /></Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
