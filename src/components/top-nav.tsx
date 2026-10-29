"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Bell, CalendarClock, Forward, Home, MessageCircle, Search, Settings, Wallet } from "lucide-react";
import { currentUserId, getPerson, photo } from "@/lib/data";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/sessions", label: "Sessions", icon: CalendarClock },
  { href: "/challenges", label: "Challenges", icon: Award },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/share", label: "Share & Earn", icon: Forward },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

export function TopNav() {
  const pathname = usePathname();
  const me = getPerson(currentUserId)!;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="flex h-16 items-center rounded-card bg-surface px-4 lg:h-20 lg:px-6">
      <Link href="/" className="shrink-0 text-[17px] font-extrabold tracking-tight text-primary">
        ZeeKoach
      </Link>

      <label className="ml-7 hidden h-10 w-[191px] items-center gap-2 rounded-[10px] bg-bg px-3 text-sm text-muted md:flex">
        <Search className="size-3.5" aria-hidden />
        <input className="w-full bg-transparent outline-none placeholder:text-muted" placeholder="Search" aria-label="Search" />
      </label>

      {/* Icon tabs, as in the Figma. On phones they move to a bottom bar. */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:static lg:flex-1 lg:border-0">
        <ul className="flex items-center justify-around px-2 py-2 lg:justify-center lg:gap-[43px] lg:p-0">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-[46px] w-[66px] items-center justify-center rounded-[12px] transition-colors ${
                    active ? "bg-primary text-white" : "text-[#7c7c8a] hover:bg-bg hover:text-primary"
                  }`}
                >
                  <Icon className="size-[19px]" strokeWidth={1.8} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-6 lg:ml-0 lg:border-l lg:border-line lg:pl-10">
        <Link href={`/profile/${me.id}`} aria-label="Your profile">
          <img src={photo(me.photo, 30, 30, true)} alt="" className="size-[30px] rounded-[8px] object-cover" />
        </Link>
        <button aria-label="Notifications" className="text-[#7c7c8a] hover:text-primary">
          <Bell className="size-[19px]" strokeWidth={1.8} />
        </button>
        <button aria-label="Settings" className="hidden text-[#7c7c8a] hover:text-primary sm:block">
          <Settings className="size-[19px]" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
