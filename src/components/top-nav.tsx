"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, Home, MessageCircle, Search, Settings, Trophy, Wallet } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { currentUserId, getPerson } from "@/lib/data";

// Labels under every icon: the review found the icon-only nav hard to read.
const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

export function TopNav() {
  const pathname = usePathname();
  const me = getPerson(currentUserId)!;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1400px] items-center gap-3 rounded-2xl bg-surface px-4 py-2 shadow-sm sm:gap-6 sm:px-6"
      >
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight text-primary">
          Zee<span className="font-extrabold">KOACH</span>
        </Link>

        <label className="hidden items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm text-muted md:flex md:w-56">
          <Search className="size-4" aria-hidden />
          <input className="w-full bg-transparent outline-none placeholder:text-muted" placeholder="Search Koaches, sessions" />
        </label>

        {/* On phones the same links move to a bottom tab bar, so the header never overflows. */}
        <ul className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-surface px-2 py-1.5 sm:static sm:mx-auto sm:justify-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active ? "bg-primary text-white" : "text-muted hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
          <button aria-label="Notifications" className="rounded-xl p-2 text-muted hover:bg-surface-muted hover:text-ink">
            <Bell className="size-5" />
          </button>
          <button aria-label="Settings" className="hidden rounded-xl p-2 text-muted hover:bg-surface-muted hover:text-ink sm:block">
            <Settings className="size-5" />
          </button>
          <Link href={`/profile/${me.id}`} aria-label="Your profile" className="ml-1">
            <Avatar person={me} size="sm" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
