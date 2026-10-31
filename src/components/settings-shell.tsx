"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Crown, Globe, IdCard, LifeBuoy, Lock, ShieldBan, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const links = [
  { href: "/settings/profile", label: "Profile", Icon: UserRound },
  { href: "/settings/account", label: "Account and password", Icon: Lock },
  { href: "/settings/verification", label: "Verification", Icon: IdCard },
  { href: "/upgrade", label: "Plans", Icon: Crown },
  { href: "/settings/privacy", label: "Blocked and muted", Icon: ShieldBan },
  { href: "/settings/notifications", label: "Notifications", Icon: Bell },
  { href: "/settings/preferences", label: "Language and currency", Icon: Globe },
  { href: "/settings/emergency", label: "Emergency contacts", Icon: LifeBuoy },
];

// Settings pages share this layout: the list of sections on the left, the section on the right.
export function SettingsShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  const path = usePathname();
  const { ready, user } = useAuth();
  return (
    <div className="mx-auto mt-[30px] grid max-w-[980px] gap-[20px] md:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Settings" className="h-fit rounded-card bg-surface p-[10px] max-md:flex max-md:gap-1 max-md:overflow-x-auto">
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-[12px] px-[14px] py-[11px] text-[13px] font-bold ${path === href ? "bg-primary-soft text-primary" : "text-muted hover:bg-bg hover:text-ink"}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
      <section className="rounded-card bg-surface px-[30px] py-[28px] max-sm:px-[20px]">
        <h1 className="text-[22px] font-bold">{title}</h1>
        {sub && <p className="mt-1.5 text-[13px] font-semibold text-muted">{sub}</p>}
        <div className="mt-6">
          {!ready ? (
            <p className="text-[13px] font-semibold text-muted">Loading…</p>
          ) : !user ? (
            <Link href="/login" className="flex h-11 max-w-[240px] items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
          ) : (
            children
          )}
        </div>
      </section>
    </div>
  );
}
