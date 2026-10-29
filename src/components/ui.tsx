import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { AppleIcon, FacebookIcon, InstagramIcon, LinkedinIcon, PlayIcon, TwitterIcon, YoutubeIcon } from "@/components/brand-icons";
import { currentUserId, people, photo, type Person, type PhotoKey } from "@/lib/data";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-card bg-surface ${className}`}>{children}</section>;
}

export function CardHeader({ title, href = "#" }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between px-[25px] pt-[21px]">
      <h2 className="text-[15px] font-bold">{title}</h2>
      <Link href={href} className="text-xs font-bold text-primary">
        All
      </Link>
    </div>
  );
}

// Purple frame for Koaches, yellow for ProKoaches, as in the Figma.
const frame = { member: "", koach: "border-2 border-primary", prokoach: "border-2 border-yellow" };

export function Avatar({ person, size = 46, live = false }: { person: Person; size?: number; live?: boolean }) {
  const initials = person.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {person.real && !person.avatarUrl ? (
        <span style={{ fontSize: size * 0.36 }} className={`flex size-full items-center justify-center rounded-[12px] bg-primary-soft font-bold text-primary ${frame[person.role]}`}>
          {initials}
        </span>
      ) : (
        <img
          src={person.avatarUrl ?? photo(person.photo, size, size, true)}
          alt=""
          className={`size-full rounded-[12px] bg-primary-soft object-cover ${frame[person.role]}`}
          loading="lazy"
        />
      )}
      {live && <span className="absolute -right-1 -top-1 size-[10px] rounded-full border-2 border-white bg-live" aria-label="Live now" />}
    </span>
  );
}

export function Photo({ k, w, h, className = "", alt = "" }: { k: PhotoKey; w: number; h: number; className?: string; alt?: string }) {
  return <img src={photo(k, w, h)} alt={alt} className={`bg-[#1b1b22] object-cover ${className}`} loading="lazy" />;
}

export function FollowerStack({ extra = 38 }: { extra?: number }) {
  const faces = people.slice(1, 4);
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex -space-x-1">
        {faces.map((p) => (
          <img key={p.id} src={photo(p.photo, 22, 22, true)} alt="" className="size-[22px] rounded-[6px] border border-white object-cover" />
        ))}
      </span>
      <span className="text-xs font-semibold text-muted">+{extra}</span>
    </span>
  );
}

export function OutlineButton({ children, href = "#" }: { children: React.ReactNode; href?: string }) {
  return (
    <Link
      href={href}
      className="flex h-[70px] items-center justify-center rounded-card border-[1.5px] border-primary bg-surface text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white"
    >
      {children}
    </Link>
  );
}

export function FollowButton() {
  return <button className="text-xs font-bold text-primary hover:underline">Follow</button>;
}

export function PersonRow({ person, sub, live = false }: { person: Person; sub: React.ReactNode; live?: boolean }) {
  return (
    <li className="flex items-center gap-[15px] rounded-[14px] px-[10px] py-[10px] hover:bg-bg">
      <Link href={`/profile/${person.id}`}>
        <Avatar person={person} live={live} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/profile/${person.id}`} className="flex items-center gap-1.5 text-[15px] font-bold hover:text-primary">
          <span className="truncate">{person.name}</span>
          {person.verified && <BadgeCheck className="size-[15px] shrink-0 fill-[#3d8bff] text-white" aria-label="Verified" />}
        </Link>
        <div className="mt-[6px] text-[13px] font-semibold text-muted">{sub}</div>
      </div>
      <FollowButton />
    </li>
  );
}

export function FollowSuggestions() {
  const list = people.filter((p) => p.id !== currentUserId).slice(0, 5);
  return (
    <Card className="pb-[15px]">
      <CardHeader title="Follow Suggestions" />
      <ul className="mt-[13px] space-y-[5px] px-[15px]">
        {list.map((p) => (
          <PersonRow key={p.id} person={p} sub={<FollowerStack />} />
        ))}
      </ul>
    </Card>
  );
}

export function DownloadApp() {
  return (
    <Card className="flex flex-col items-center gap-[15px] py-[25px]">
      <a href="#" className="flex h-[72px] w-[220px] items-center gap-3 rounded-[12px] border border-[#a6a6a6] bg-black px-5 text-white">
        <PlayIcon className="size-9" />
        <span className="leading-tight">
          <span className="block text-[11px] font-medium uppercase">Get it on</span>
          <span className="block text-[22px] font-semibold">Google Play</span>
        </span>
      </a>
      <a href="#" className="flex h-[72px] w-[220px] items-center gap-3 rounded-[12px] border border-[#a6a6a6] bg-black px-5 text-white">
        <AppleIcon className="size-9" />
        <span className="leading-tight">
          <span className="block text-[11px] font-medium">Download on the</span>
          <span className="block text-[22px] font-semibold">App Store</span>
        </span>
      </a>
    </Card>
  );
}

const socials = [
  { label: "YouTube", Icon: YoutubeIcon },
  { label: "Facebook", Icon: FacebookIcon },
  { label: "Instagram", Icon: InstagramIcon },
  { label: "LinkedIn", Icon: LinkedinIcon },
  { label: "Twitter", Icon: TwitterIcon },
];

export function FollowUs() {
  return (
    <div>
      <Card className="flex h-[82px] items-center justify-between px-[25px]">
        {socials.map(({ label, Icon }) => (
          <a key={label} href="#" aria-label={label} className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft">
            <Icon className="size-[18px]" />
          </a>
        ))}
      </Card>
      <p className="mt-[20px] text-center text-xs font-semibold text-primary">Version 1.1 © 2026 ZeeKoach</p>
    </div>
  );
}

export function RightRailFooter() {
  return (
    <>
      <DownloadApp />
      <FollowUs />
    </>
  );
}

export function Fab({ href }: { href?: string }) {
  const cls =
    "fixed bottom-20 right-5 z-30 flex size-16 items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_30px_rgba(107,72,255,0.45)] hover:bg-primary-strong lg:bottom-10 lg:right-10 lg:size-20";
  const icon = (
    <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
  return href ? (
    <Link href={href} aria-label="Create" className={cls}>
      {icon}
    </Link>
  ) : (
    <button aria-label="Create" className={cls}>
      {icon}
    </button>
  );
}

// Three columns of 330 / 640 / 330 px with 30 px gaps, as in every Figma desktop screen.
export function ThreeColumns({ left, center, right }: { left: React.ReactNode; center: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="mt-[30px] grid gap-[30px] lg:grid-cols-[minmax(0,640px)_330px] lg:justify-center xl:grid-cols-[330px_minmax(0,640px)_330px] xl:justify-between">
      <div className="order-2 space-y-[25px] lg:col-span-2 xl:order-none xl:col-span-1">{left}</div>
      <div className="order-1 min-w-0 space-y-[30px] xl:order-none">{center}</div>
      <div className="order-3 hidden space-y-[30px] lg:block xl:order-none">{right}</div>
    </div>
  );
}
