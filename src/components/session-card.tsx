import Link from "next/link";
import { Star, ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SessionVisual } from "@/components/session-visual";
import { formatDate, formatPrice, getPerson, type Session } from "@/lib/data";

export function SessionCard({ session }: { session: Session }) {
  const koach = getPerson(session.koachId)!;
  const spotsLeft = session.capacity - session.attendees;
  return (
    <article className="flex flex-col rounded-2xl bg-surface p-3 shadow-sm">
      <div className="relative">
        <SessionVisual sport={session.sport} className="h-36" />
        <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {session.format === "stream" ? "Live stream" : "In person"}
        </span>
        <span className="absolute -bottom-5 left-3">
          <Avatar person={koach} size="md" />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-7">
        <p className="text-xs font-semibold text-muted">{koach.name}</p>
        <h3 className="mt-0.5 font-bold leading-snug">
          <Link href={`/sessions/${session.id}`} className="hover:text-primary">
            {session.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-muted">
          {formatDate(session.date)} · {session.start}–{session.end} · {spotsLeft > 0 ? `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left` : "Full"}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <ThumbsUp className="size-3.5" aria-hidden /> {session.likes}
          </span>
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-accent text-accent" aria-hidden />
            <span className="font-semibold text-ink">{session.rating.toFixed(1)}</span> ({session.reviews})
          </span>
          {session.format === "in-person" && <span>{koach.distanceKm} km</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <p className="text-sm text-muted">
            {session.pricing === "private" ? "Private" : "Per person"}{" "}
            <span className="text-base font-bold text-accent-text">{formatPrice(session.price)}</span>
          </p>
          <Link
            href={`/book/${session.id}`}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-strong"
          >
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}
