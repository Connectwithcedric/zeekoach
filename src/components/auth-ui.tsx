"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronLeft, Eye, EyeOff, X } from "lucide-react";

// The sign in / sign up modals from the Figma "SignIn/SignUp" sheet (Elements page): a 400px white
// card over the page, underlined fields, a full-width purple button.

export function Logo({ className = "" }: { className?: string }) {
  return <span className={`text-[22px] font-extrabold tracking-tight text-primary ${className}`}>ZeeKoach</span>;
}

export function Modal({ children, title, tabs, onBack, banner, wide }: { children: React.ReactNode; title?: string; tabs?: "in" | "up"; onBack?: () => void; banner?: React.ReactNode; wide?: boolean }) {
  const router = useRouter();
  return (
    <div>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[rgba(25,26,30,0.45)] px-4 py-[8vh]">
        <div className={`w-full ${wide ? "max-w-[460px]" : "max-w-[400px]"}`}>
          {banner}
          <div role="dialog" aria-modal className="rounded-[10px] bg-surface px-6 pb-8 pt-6 sm:px-10 sm:pb-9 shadow-[0_20px_60px_rgba(25,26,30,0.18)]">
            <div className="relative flex h-6 items-center justify-center">
              {onBack && (
                <button type="button" aria-label="Back" onClick={onBack} className="absolute left-[-14px] grid size-8 place-items-center text-muted hover:text-ink">
                  <ChevronLeft className="size-5" />
                </button>
              )}
              {title && <h1 className="text-[14px] font-bold">{title}</h1>}
              <button type="button" aria-label="Close" onClick={() => router.push("/")} className="absolute right-[-14px] grid size-8 place-items-center text-muted hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            {tabs && (
              <div className="mt-4 flex items-center justify-center gap-6 text-[16px] font-bold">
                <Link href="/login" className={tabs === "in" ? "text-primary" : "text-[#8b8b9c] hover:text-ink"}>Sign In</Link>
                <span className="h-7 w-px bg-[#8b8b9c]/60" />
                <Link href="/signup" className={tabs === "up" ? "text-primary" : "text-[#8b8b9c] hover:text-ink"}>Sign Up</Link>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-[14px] font-bold ${className}`}>{children}</h2>;
}

const line = "w-full border-b-2 border-line bg-transparent pb-2 text-[14px] font-bold outline-none placeholder:font-medium placeholder:text-[#8b8b9c] focus:border-primary";

export function Field({ label, error, ...props }: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-[12px] font-medium text-[#8b8b9c]">{label}</span>}
      <input {...props} className={`${line} ${label ? "" : "pt-2"}`} />
      {error && <span className="mt-1.5 block text-[12px] font-semibold text-live">{error}</span>}
    </label>
  );
}

export function PasswordField({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <label className="block">
      {label && <span className="mb-1 block text-[12px] font-medium text-[#8b8b9c]">{label}</span>}
      <span className="relative block">
        <input {...props} type={shown ? "text" : "password"} className={`${line} pr-8 ${label ? "" : "pt-2"}`} />
        <button type="button" onClick={() => setShown(!shown)} aria-label={shown ? "Hide password" : "Show password"} className="absolute bottom-2 right-0 text-[#8b8b9c] hover:text-ink">
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

export function SelectField({ label, children, ...props }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[12px] font-medium text-[#8b8b9c]">{label}</span>
      <span className="relative block">
        <select {...props} className={`${line} cursor-pointer appearance-none pr-6`}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute bottom-2.5 right-0 size-4 text-ink" />
      </span>
    </label>
  );
}

export function Button({ busy, children, light, ...props }: { busy?: boolean; light?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`flex h-[38px] w-full items-center justify-center rounded-[12px] text-[13px] font-bold transition ${light ? "bg-primary-soft text-primary hover:bg-[#e2dcff]" : "bg-primary text-white hover:bg-primary-strong disabled:bg-[#d9d2ff] disabled:hover:bg-[#d9d2ff]"}`}
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function Toggle({ on, children, ...props }: { on: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={`h-[34px] flex-1 rounded-[10px] text-[12px] font-bold transition disabled:opacity-60 ${on ? "bg-primary text-white" : "bg-[#f4f2ff] text-ink hover:bg-primary-soft"}`}>
      {children}
    </button>
  );
}

export function Message({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return <p className={`rounded-[8px] px-3 py-2.5 text-[12px] font-semibold ${tone === "error" ? "bg-[#fdecee] text-live" : "bg-primary-soft text-primary"}`}>{children}</p>;
}

// The purple strip above a modal, like "An email has been sent for you to reset your password".
export function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mb-[-6px] flex w-[88%] items-center gap-2 rounded-t-[10px] bg-primary px-4 pb-4 pt-2.5 text-[11px] font-semibold text-white">
      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-white text-[10px] font-extrabold text-primary">i</span>
      {children}
    </div>
  );
}

export function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[11px] font-medium text-[#8b8b9c]">
      <span className={`mt-[3px] size-2.5 shrink-0 rounded-full ${ok ? "bg-primary" : "bg-[#c9c9d4]"}`} />
      {children}
    </li>
  );
}
