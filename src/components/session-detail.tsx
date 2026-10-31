"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, Info, MapPin, Navigation, Share2 } from "lucide-react";
import { Avatar, Photo } from "@/components/ui";
import { useToday } from "@/lib/use-today";
import { formatDate, formatPrice, getLocation, getPerson, sameDay, sessionDate, type Session } from "@/lib/data";

function Dot() {
  return <span className="mx-2 inline-block size-[3px] rounded-full bg-muted align-middle" />;
}

function Divider() {
  return <span className="mx-2.5 inline-block h-3 w-px bg-line align-middle" />;
}

// Stand-in for a real map until a maps provider is chosen.
function MapPlaceholder() {
  return (
    <svg viewBox="0 0 330 160" className="h-[160px] w-full rounded-[16px] bg-[#f1f0ec]" aria-hidden>
      <g stroke="#ffffff" strokeWidth="9" fill="none">
        <path d="M-10 40 L340 95" />
        <path d="M60 -10 L130 170" />
        <path d="M210 -10 L250 170" />
        <path d="M-10 130 L340 150" />
      </g>
      <g fill="#e2e1dc">
        <rect x="140" y="20" width="50" height="35" rx="3" />
        <rect x="20" y="70" width="40" height="40" rx="3" />
        <rect x="265" y="30" width="45" height="45" rx="3" />
        <rect x="150" y="100" width="70" height="30" rx="3" />
      </g>
      <circle cx="160" cy="78" r="7" fill="#34a853" />
      <text x="172" y="82" fontSize="10" fill="#34a853" fontWeight="600">TeamFit Gym &amp; Fitness</text>
      <circle cx="232" cy="122" r="5" fill="#4285f4" />
      <text x="240" y="125" fontSize="9" fill="#4285f4">Pro Bike</text>
    </svg>
  );
}

// The session card from the Figma "Sessions Page" modal.
export function SessionDetail({ session, bookedBanner = false }: { session: Session; bookedBanner?: boolean }) {
  const koach = getPerson(session.koachId)!;
  const location = getLocation(session.locationId)!;
  const today = useToday();
  const date = today && sessionDate(session, today);
  const isToday = !!date && !!today && sameDay(date, today);
  const tags = [`${session.ageMin}+`, session.indoor ? "Indoor" : "Outdoor", session.format === "stream" ? "Stream" : "In Person"];
  if (session.pricing === "per-person") tags.push(`${session.attendees} Attendees`);

  return (
    <article className="w-full max-w-[410px] overflow-hidden rounded-card bg-surface">
      {bookedBanner && (
        <p className="flex items-center justify-center gap-2 bg-primary py-3 text-xs font-bold text-white">
          <Info className="size-4" aria-hidden /> You have a booking for this session
        </p>
      )}
      <div className="p-5">
        <div className="relative">
          <Photo k={session.image} w={370} h={200} className="h-[200px] w-full rounded-[16px]" />
          <span className="absolute left-4 top-4 rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            {session.format === "stream" ? "Stream" : "In person"}
          </span>
          <span className="absolute bottom-4 right-4 flex gap-1.5">
            <button aria-label="Previous photo" className="flex size-6 items-center justify-center rounded-md bg-black/50 text-white">
              <ChevronLeft className="size-4" />
            </button>
            <button aria-label="Next photo" className="flex size-6 items-center justify-center rounded-md bg-black/50 text-white">
              <ChevronRight className="size-4" />
            </button>
          </span>
          <span className="absolute -bottom-[25px] left-[10px]">
            <Avatar person={koach} size={50} />
          </span>
        </div>
        <p className="ml-[72px] mt-2 text-[13px] font-semibold text-muted">{koach.name}</p>

        <h1 className="mt-5 text-[17px] font-bold">{session.title}</h1>
        <p className="mt-3 text-[13px] font-semibold text-muted">
          {tags.map((t, i) => (
            <span key={t}>
              {i > 0 && <Divider />}
              {t}
            </span>
          ))}
        </p>
        <p className="mt-3 text-[13px] font-semibold text-muted">
          {isToday && <span className="font-bold text-live">Today</span>}
          {isToday && <Dot />}
          {date ? formatDate(date) : "\u00a0"}
          <Divider />
          {session.start}-{session.end}
        </p>
        <p className="mt-2 text-[13px] font-semibold text-muted">
          <span className="font-bold text-yellow">{formatPrice(session.price)}</span>
          <Dot />
          {session.pricing === "private" ? "Private Session" : "Per Person"}
        </p>

        <p className="mt-4 text-[13px] leading-[1.6] text-muted">{session.description}</p>
        <h2 className="mt-5 text-[13px] font-bold">Equipment needed</h2>
        <p className="mt-2 text-[13px] leading-[1.6] text-muted">{session.equipment}</p>

        {session.format === "in-person" && (
          <>
            <h2 className="mt-5 text-[13px] font-bold">Location</h2>
            <div className="relative mt-3">
              <MapPlaceholder />
              <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md bg-[#77777f] text-white">
                <Navigation className="size-4" aria-hidden />
              </span>
              <span className="absolute -bottom-6 left-0 flex size-[50px] items-center justify-center rounded-[12px] bg-primary text-white">
                <MapPin className="size-6" aria-hidden />
              </span>
            </div>
            <h3 className="mt-10 text-[15px] font-bold">{location.name}</h3>
            <h4 className="mt-3 text-[13px] font-bold">Meet up instructions</h4>
            <p className="mt-2 text-[13px] leading-[1.6] text-muted">{location.meetUp}</p>
            <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-muted">
              <span className="flex-1">{location.address}</span>
              <button aria-label="Copy address" className="flex size-7 items-center justify-center rounded-md bg-bg text-primary">
                <Copy className="size-3.5" />
              </button>
              <button aria-label="Share location" className="flex size-7 items-center justify-center rounded-md bg-bg text-primary">
                <Share2 className="size-3.5" />
              </button>
            </div>
          </>
        )}

        {session.cancelled ? (
          <p className="mt-6 flex h-[42px] items-center justify-center rounded-[12px] bg-[#fdecee] text-[13px] font-bold text-live">Cancelled</p>
        ) : (
          <Link href={`/book/${session.id}`} className="mt-6 flex h-[42px] items-center justify-center rounded-[12px] bg-primary text-[13px] font-bold text-white hover:bg-primary-strong">
            Book
          </Link>
        )}
        <Link href={`/profile/${koach.id}`} className="mt-3 flex h-[42px] items-center justify-center rounded-[12px] bg-bg text-[13px] font-bold text-primary hover:bg-primary-soft">
          View Profile
        </Link>
      </div>
    </article>
  );
}
