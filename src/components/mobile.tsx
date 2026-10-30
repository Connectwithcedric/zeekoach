"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";

// Building blocks for the phone-sized screens: a screen with a back arrow, inputs and big buttons.

export function Screen({ title, sub, back, children, footer }: { title?: string; sub?: React.ReactNode; back?: string | (() => void); children: React.ReactNode; footer?: React.ReactNode }) {
  const router = useRouter();
  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8 pt-4">
      <div className="h-11">
        {back && (
          <button
            type="button"
            aria-label="Back"
            onClick={() => (typeof back === "string" ? router.push(back) : back())}
            className="-ml-1 grid size-11 place-items-center rounded-full bg-surface text-ink shadow-[0_2px_10px_rgba(25,26,30,0.06)]"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
      </div>
      {title && <h1 className="mt-6 text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>}
      {sub && <p className="mt-2 text-[15px] font-semibold leading-snug text-muted">{sub}</p>}
      <div className="mt-8 flex flex-1 flex-col">{children}</div>
      {footer && <div className="mt-6 text-center text-[14px] font-semibold text-muted">{footer}</div>}
    </main>
  );
}

const inputClass = "h-14 w-full rounded-[16px] border-2 border-transparent bg-surface px-4 text-[16px] font-semibold outline-none placeholder:text-muted focus:border-primary";

export function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[14px] font-bold">{label}</span>
      <input {...props} className={`mt-2 ${inputClass}`} />
    </label>
  );
}

export function PasswordInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <label className="block">
      <span className="text-[14px] font-bold">{label}</span>
      <span className="relative mt-2 block">
        <input {...props} type={shown ? "text" : "password"} className={`${inputClass} pr-14`} />
        <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted">
          {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </span>
    </label>
  );
}

const big = "flex h-14 w-full items-center justify-center rounded-[16px] text-[16px] font-bold transition disabled:opacity-50";

export function BigButton({ busy, children, ...props }: { busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} disabled={busy || props.disabled} className={`${big} bg-primary text-white active:bg-primary-strong`}>
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function BigLink({ href, light, children }: { href: string; light?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${big} ${light ? "bg-surface text-ink" : "bg-primary text-white active:bg-primary-strong"}`}>
      {children}
    </Link>
  );
}

export function Message({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return <p className={`rounded-[14px] px-4 py-3 text-[14px] font-semibold ${tone === "error" ? "bg-[#fdecee] text-live" : "bg-primary-soft text-primary"}`}>{children}</p>;
}

export function Steps({ count, at }: { count: number; at: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Step ${at + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= at ? "bg-primary" : "bg-line"}`} />
      ))}
    </div>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className={`text-[22px] font-extrabold tracking-tight ${light ? "text-white" : "text-primary"}`}>
      Zee<span className={light ? "text-yellow" : "text-ink"}>Koach</span>
    </span>
  );
}
