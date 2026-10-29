"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { DualRange, SingleRange, Toggle } from "@/components/controls";
import { Modal } from "@/components/modal";
import { SessionDetail } from "@/components/session-detail";
import { ExploreFollowing } from "@/components/tabs-bar";
import { Avatar, Card, CardHeader, Fab, OutlineButton, FollowerStack, FollowSuggestions, PersonRow, RightRailFooter, ThreeColumns } from "@/components/ui";
import { useAuth } from "@/components/auth-provider";
import { useLiveSessions, useMyBookingIds } from "@/lib/live-data";
import { useToday } from "@/lib/use-today";
import { currentUserId, formatPrice, formatTime, getPerson, people, sameDay, sessionDate, sessions, type Session } from "@/lib/data";

const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const clock = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const duration = (s: Session) => minutes(s.end) - minutes(s.start);

const initialFilters = {
  query: "",
  inPerson: true,
  stream: true,
  radius: 4500,
  price: [0, 60] as [number, number],
  duration: 120,
  attendees: [1, 100] as [number, number],
  time: [0, 24 * 60] as [number, number],
  koaches: true,
  prokoaches: true,
  male: true,
  female: true,
  indoor: true,
  outdoor: true,
};
type Filters = typeof initialFilters;

function FiltersPanel({ f, set }: { f: Filters; set: (patch: Partial<Filters>) => void }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <Card className="px-[25px] pb-[25px] pt-[21px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">Sessions Filters</h2>
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-primary">
          {expanded ? "Show less" : "Show more"}
        </button>
      </div>
      <label className="mt-[23px] flex h-10 items-center gap-2 rounded-[10px] bg-bg px-3 text-sm text-muted">
        <Search className="size-3.5" aria-hidden />
        <input
          value={f.query}
          onChange={(e) => set({ query: e.target.value })}
          className="w-full bg-transparent outline-none placeholder:text-muted"
          placeholder="Search"
          aria-label="Search sessions"
        />
      </label>

      <p className="mt-5 text-[13px] font-bold">Class type</p>
      <Toggle label="In Person" checked={f.inPerson} onChange={(v) => set({ inPerson: v })} />
      <Toggle label="Stream" checked={f.stream} onChange={(v) => set({ stream: v })} />

      {expanded && (
        <>
          {/* Radius, duration, attendees and gender are shown as designed; they filter once real data has those fields. */}
          <SingleRange label="Target radius" min={0} max={6371} value={f.radius} onChange={(v) => set({ radius: v })} format={(v) => (v === 6371 ? "6.371 km" : `${v} km`)} />
          <DualRange label="Price range" min={0} max={60} value={f.price} onChange={(v) => set({ price: v })} format={(v) => `$${v}`} />
          <SingleRange label="Class duration" min={30} max={120} step={5} value={f.duration} onChange={(v) => set({ duration: v })} format={(v) => `${v} min`} />
          <DualRange label="Attendees range" min={1} max={100} value={f.attendees} onChange={(v) => set({ attendees: v })} format={String} />
          <DualRange label="Time range" min={0} max={1440} step={30} value={f.time} onChange={(v) => set({ time: v })} format={clock} />

          <p className="mt-6 text-[13px] font-bold">User type</p>
          <Toggle label="Koaches" checked={f.koaches} onChange={(v) => set({ koaches: v })} />
          <Toggle label="Prokoaches" checked={f.prokoaches} onChange={(v) => set({ prokoaches: v })} />
          <p className="mt-4 text-[13px] font-bold">User gender</p>
          <Toggle label="Male" checked={f.male} onChange={(v) => set({ male: v })} />
          <Toggle label="Female" checked={f.female} onChange={(v) => set({ female: v })} />
          <p className="mt-4 text-[13px] font-bold">Area type</p>
          <Toggle label="Indoor" checked={f.indoor} onChange={(v) => set({ indoor: v })} />
          <Toggle label="Outdoor" checked={f.outdoor} onChange={(v) => set({ outdoor: v })} />
        </>
      )}
    </Card>
  );
}

const weekday = ["S", "M", "T", "W", "T", "F", "S"];
const weekdayLong = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ordinal = (n: number) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");

function SessionRow({ s, me, booked, onOpen, onBook }: { s: Session; me: string; booked: boolean; onOpen: () => void; onBook: () => void }) {
  const koach = getPerson(s.koachId)!;
  const mine = s.koachId === me;
  return (
    <li className="flex items-center gap-5 py-[15px]">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-5 text-left">
        <Avatar person={koach} size={50} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold hover:text-primary">{s.title}</span>
          <span className="mt-1 block text-[13px] font-bold text-muted">
            {formatTime(s.start)} - {formatTime(s.end)}
            {s.format === "stream" && (
              <>
                <span className="mx-2 inline-block size-[3px] rounded-full bg-muted align-middle" />
                STREAM
              </>
            )}
          </span>
          <span className="mt-1 block text-[13px] font-semibold text-muted">
            <span className="font-bold text-yellow">{formatPrice(s.price)}</span>
            <span className="mx-2 inline-block size-[3px] rounded-full bg-muted align-middle" />
            {s.pricing === "private" ? "Private Session" : "Per Person"}
          </span>
        </span>
      </button>
      {s.real && s.attendees >= s.capacity && !booked && !mine ? (
        <span className="text-xs font-bold text-muted">Full</span>
      ) : null}
      {s.pricing === "per-person" && s.attendees > 3 && (
        <span className="hidden sm:block">
          <FollowerStack extra={s.attendees - 3} />
        </span>
      )}
      {mine ? (
        <Link href={s.real ? `/sessions/new?edit=${s.id}` : "#"} className="flex h-9 w-[100px] items-center justify-center rounded-[10px] bg-bg text-[13px] font-bold text-primary">
          Edit
        </Link>
      ) : booked ? (
        <span className="flex h-9 w-[100px] items-center justify-center rounded-[10px] bg-primary text-white" aria-label="Booked">
          <Check className="size-4" />
        </span>
      ) : (
        <button onClick={onBook} className="h-9 w-[100px] rounded-[10px] bg-primary text-[13px] font-bold text-white hover:bg-primary-strong">
          Book
        </button>
      )}
    </li>
  );
}

export function SessionsBoard({ bookedIds: demoBooked = [] }: { bookedIds?: string[] }) {
  const router = useRouter();
  useLiveSessions();
  const { user, profile } = useAuth();
  const me = user?.id ?? currentUserId;
  const myBookings = useMyBookingIds(user?.id);
  const bookedIds = user ? myBookings : demoBooked;
  const canCreate = !!profile && profile.role !== "member";
  const today = useToday();
  const days = useMemo(
    () => (today ? Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)) : []),
    [today],
  );
  const [selected, setSelected] = useState(0);
  const [f, setF] = useState(initialFilters);
  const [open, setOpen] = useState<Session | null>(null);
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));

  const day = days[selected];
  const list = sessions
    .filter((s) => !!today && !!day && sameDay(sessionDate(s, today), day))
    .filter((s) => {
      const koach = getPerson(s.koachId)!;
      const t = minutes(s.start);
      return (
        (f.query === "" || `${s.title} ${koach.name}`.toLowerCase().includes(f.query.toLowerCase())) &&
        ((s.format === "in-person" && f.inPerson) || (s.format === "stream" && f.stream)) &&
        s.price >= f.price[0] &&
        s.price <= f.price[1] &&
        duration(s) <= f.duration &&
        t >= f.time[0] &&
        t <= f.time[1] &&
        ((koach.role === "prokoach" && f.prokoaches) || (koach.role !== "prokoach" && f.koaches)) &&
        ((s.indoor && f.indoor) || (!s.indoor && f.outdoor))
      );
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  const live = people.filter((p) => p.streaming).slice(0, 7);

  return (
    <>
      <ThreeColumns
        left={
          <>
            {canCreate && <OutlineButton href="/sessions/new">+ Create a session</OutlineButton>}
            <FiltersPanel f={f} set={set} />
          </>
        }
        center={
          <>
            <ExploreFollowing />
            <Card className="pb-[10px]">
              <div className="px-[25px] pt-[21px]">
                <h1 className="h-[18px] text-[15px] font-bold">
                  {day && (
                    <>
                      {selected === 0 ? "Today, " : ""}
                      {weekdayLong[day.getDay()]}, {ordinal(day.getDate())} of {monthLong[day.getMonth()]}
                    </>
                  )}
                </h1>
                <ul className="mt-[30px] grid min-h-[93px] grid-cols-7 text-center" aria-label="Pick a day">
                  {days.map((d, i) => {
                    const active = i === selected;
                    const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <li key={i}>
                        <button onClick={() => setSelected(i)} aria-pressed={active} className="mx-auto flex flex-col items-center">
                          <span className={`text-[14px] font-bold ${active || (weekend && d.getDay() === 0) ? "text-primary" : "text-ink"}`}>{weekday[d.getDay()]}</span>
                          <span
                            className={`mt-[18px] flex size-[50px] items-center justify-center rounded-[12px] text-[15px] font-bold ${
                              active ? "bg-primary text-white" : "text-ink hover:bg-bg"
                            }`}
                          >
                            {String(d.getDate()).padStart(2, "0")}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-[30px] border-t border-line px-[25px]">
                {!today ? (
                  <div className="h-40" />
                ) : list.length ? (
                  <ul className="py-[10px]">
                    {list.map((s) => (
                      <SessionRow key={s.id} s={s} me={me} booked={bookedIds.includes(s.id)} onOpen={() => setOpen(s)} onBook={() => router.push(`/book/${s.id}`)} />
                    ))}
                  </ul>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[15px] font-bold">No sessions on this day</p>
                    <p className="mt-1 text-[13px] font-semibold text-muted">Pick another day or loosen the filters.</p>
                    <button onClick={() => setF(initialFilters)} className="mt-4 h-9 rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </>
        }
        right={
          <>
            <Card className="pb-[15px]">
              <CardHeader title="Streaming now" href={`/live/${live[0]?.id}`} />
              <ul className="mt-[13px] space-y-[5px] px-[15px]">
                {live.map((p) => (
                  <PersonRow key={p.id} person={p} live sub={<Link href={`/live/${p.id}`} className="hover:text-primary">{p.streaming}</Link>} />
                ))}
              </ul>
            </Card>
            <FollowSuggestions />
            <RightRailFooter />
          </>
        }
      />
      {open && (
        <Modal label={open.title} onClose={() => setOpen(null)}>
          <SessionDetail session={open} bookedBanner={bookedIds.includes(open.id)} />
        </Modal>
      )}
      <Fab href={canCreate ? "/sessions/new" : undefined} />
    </>
  );
}
