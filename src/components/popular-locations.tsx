"use client";

import Link from "next/link";
import { FollowToggle } from "@/components/follow-toggle";
import { Card, CardHeader, Photo } from "@/components/ui";
import { locations, withSamples } from "@/lib/data";
import { useLiveSessions } from "@/lib/live-data";

// Listed places first, then the busiest session spots (and samples while they're on).
export function PopularLocations() {
  useLiveSessions();
  const list = withSamples(locations)
    .filter((l) => l.lat !== 0)
    .sort((a, b) => Number(!!b.listed) - Number(!!a.listed))
    .slice(0, 3);
  return (
    <Card className="pb-[15px]">
      <CardHeader title="Popular Locations" href="/map" />
      <ul className="mt-[13px] space-y-[5px] px-[10px]">
        {list.map((l, i) => (
          <li key={l.id} className={`flex items-center gap-[15px] rounded-[14px] px-[15px] py-[10px] ${i === 0 ? "bg-bg" : ""}`}>
            {l.photo ? <img src={l.photo} alt="" className="size-10 rounded-[10px] object-cover" /> : <Photo k="gymInterior" w={40} h={40} className="size-10 rounded-[10px]" />}
            <div className="min-w-0 flex-1">
              {l.placeId ? <Link href={`/places/${l.placeId}`} className="block truncate text-[14px] font-bold hover:text-primary">{l.name}</Link> : <p className="truncate text-[14px] font-bold">{l.name}</p>}
              <p className="mt-1 text-[11px] font-semibold text-muted">{l.listed ? l.address || "New place" : `${l.followers} Followers`}</p>
            </div>
            {!l.real && <FollowToggle personId={l.id} />}
          </li>
        ))}
        {!list.length && <li className="px-[15px] py-[10px] text-[13px] font-semibold text-muted">No places listed yet.</li>}
      </ul>
    </Card>
  );
}
