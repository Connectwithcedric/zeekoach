import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar, RoleBadge } from "@/components/avatar";
import { Card, CardTitle } from "@/components/card";
import { RightRail } from "@/components/right-rail";
import { SessionCard } from "@/components/session-card";
import { currentUserId, locations, people, sessions } from "@/lib/data";

export default function HomePage() {
  const nearby = people.filter((p) => p.id !== currentUserId && p.role !== "user").sort((a, b) => a.distanceKm - b.distanceKm);
  const upcoming = [...sessions].sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px]">
      <aside className="order-2 space-y-4 lg:order-none">
        <Card>
          <CardTitle action={<span className="text-xs text-muted">{nearby.length} nearby</span>}>Koaches near you</CardTitle>
          <ul className="space-y-4">
            {nearby.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar person={p} />
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${p.id}`} className="block truncate text-sm font-bold hover:text-primary">
                    {p.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <RoleBadge person={p} /> {p.distanceKm} km
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle>Popular locations</CardTitle>
          <ul className="space-y-3">
            {locations.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-surface-muted text-primary">
                  <MapPin className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{l.name}</p>
                  <p className="text-xs text-muted">{l.followers} followers</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </aside>

      <section aria-labelledby="feed-title" className="order-1 lg:order-none">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 id="feed-title" className="text-2xl font-bold">Sessions this week</h1>
            <p className="text-sm text-muted">Book a spot with a Koach near you.</p>
          </div>
          <Link href="/sessions" className="text-sm font-semibold text-primary">
            All sessions
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {upcoming.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      </section>

      <div className="hidden xl:block">
        <RightRail />
      </div>
    </div>
  );
}
