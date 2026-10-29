import Link from "next/link";
import { ChevronLeft, ChevronRight, Ellipsis, Star, ThumbsUp } from "lucide-react";
import { Avatar, Photo } from "@/components/ui";
import { formatPriceLong, getPerson, type Session } from "@/lib/data";

// The 305 x 320 session card from the Figma profile page.
export function ClassCard({ session }: { session: Session }) {
  const koach = getPerson(session.koachId)!;
  return (
    <article className="rounded-card bg-surface p-[10px]">
      <div className="relative">
        <Link href={`/sessions/${session.id}`} aria-label={session.title}>
          <Photo k={session.image} w={285} h={140} className="h-[140px] w-full rounded-[16px]" />
        </Link>
        <span className="absolute left-[15px] top-[10px] rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
          {session.format === "stream" ? "Live stream" : "In person"}
        </span>
        <button aria-label="More options" className="absolute right-[15px] top-[7px] flex size-[30px] items-center justify-center rounded-lg bg-black/40 text-white">
          <Ellipsis className="size-4" />
        </button>
        <span className="absolute bottom-[10px] right-[15px] flex gap-1">
          <button aria-label="Previous photo" className="flex size-6 items-center justify-center rounded-md bg-black/40 text-white">
            <ChevronLeft className="size-4" />
          </button>
          <button aria-label="Next photo" className="flex size-6 items-center justify-center rounded-md bg-black/40 text-white">
            <ChevronRight className="size-4" />
          </button>
        </span>
        <span className="absolute -bottom-[29px] left-[15px]">
          <Avatar person={koach} size={50} />
        </span>
      </div>
      <div className="px-[15px] pb-[5px]">
        <h3 className="mt-[39px] text-[17px] font-bold">
          <Link href={`/sessions/${session.id}`} className="hover:text-primary">
            {session.title}
          </Link>
        </h3>
        <div className="mt-[12px] flex items-center justify-between text-[13px] font-semibold text-muted">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="size-4" aria-hidden /> {session.likes}
          </span>
          <span className="flex items-center gap-1">
            <Star className="size-4 fill-yellow text-yellow" aria-hidden />
            <span className="font-bold text-ink">{session.rating}</span> ({session.reviews})
          </span>
          <span className="font-bold text-ink">{session.format === "stream" ? "Online" : `${koach.distanceKm}km`}</span>
        </div>
        <div className="mt-[22px] flex items-center justify-between border-t border-line pt-[12px]">
          <p className="text-[14px] font-semibold">
            Starts at <span className="font-bold text-yellow">{formatPriceLong(session.price)}</span>
          </p>
          <Link href={`/book/${session.id}`} className="flex h-9 w-[100px] items-center justify-center rounded-[10px] bg-primary text-[13px] font-bold text-white hover:bg-primary-strong">
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}
