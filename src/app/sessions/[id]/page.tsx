import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { Avatar, RoleBadge } from "@/components/avatar";
import { Card } from "@/components/card";
import { SessionVisual } from "@/components/session-visual";
import { formatDate, formatPrice, getLocation, getPerson, getSession, sessions } from "@/lib/data";

export function generateStaticParams() {
  return sessions.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sessions/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getSession(id)?.title ?? "Session" };
}

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();
  const koach = getPerson(session.koachId)!;
  const location = getLocation(session.locationId)!;
  const spotsLeft = session.capacity - session.attendees;

  const facts = [
    { icon: CalendarDays, text: formatDate(session.date) },
    { icon: Clock, text: `${session.start}–${session.end}` },
    { icon: Users, text: `${session.attendees} going · ${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left` },
    { icon: MapPin, text: session.format === "stream" ? "Online" : location.name },
  ];

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_320px]">
      <Card className="p-4">
        <SessionVisual sport={session.sport} className="h-64" />
        <div className="px-2 pt-5">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {[session.format === "stream" ? "Live stream" : "In person", session.indoor ? "Indoor" : "Outdoor", `${session.ageMin}+`, session.sport].map(
              (t) => (
                <span key={t} className="rounded-md bg-surface-muted px-2 py-1">
                  {t}
                </span>
              ),
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold">{session.title}</h1>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {facts.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-muted">
                <Icon className="size-4 text-primary" aria-hidden /> {text}
              </li>
            ))}
          </ul>
          <h2 className="mt-6 font-bold">About this session</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{session.description}</p>
          <h2 className="mt-5 font-bold">What to bring</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{session.equipment}</p>
          {session.format === "in-person" && (
            <>
              <h2 className="mt-5 font-bold">Location</h2>
              <p className="mt-1 text-sm font-semibold">{location.name}</p>
              <p className="text-sm text-muted">{location.address}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{location.meetUp}</p>
            </>
          )}
        </div>
      </Card>

      <aside className="space-y-4">
        <Card className="lg:sticky lg:top-28">
          <p className="text-sm text-muted">{session.pricing === "private" ? "Private session" : "Price per person"}</p>
          <p className="text-3xl font-bold">{formatPrice(session.price)}</p>
          <Link
            href={`/book/${session.id}`}
            className={`mt-4 block rounded-xl py-3 text-center font-semibold text-white ${
              spotsLeft > 0 ? "bg-primary hover:bg-primary-strong" : "pointer-events-none bg-muted"
            }`}
            aria-disabled={spotsLeft <= 0}
          >
            {spotsLeft > 0 ? "Book" : "Session full"}
          </Link>
          <p className="mt-2 text-center text-xs text-muted">Free cancellation up to 24 hours before.</p>

          <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
            <Avatar person={koach} />
            <div className="min-w-0">
              <p className="truncate font-bold">{koach.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <RoleBadge person={koach} /> ★ {koach.rating.toFixed(1)} ({koach.reviews})
              </div>
            </div>
          </div>
          <Link
            href={`/profile/${koach.id}`}
            className="mt-4 block rounded-xl bg-surface-muted py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/10"
          >
            View profile
          </Link>
        </Card>
      </aside>
    </div>
  );
}
