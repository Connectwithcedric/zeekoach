"use client";

import { useState } from "react";
import { enabledProviders, supabase } from "@/lib/supabase";

const providers = [
  { id: "apple", label: "Continue with Apple", dark: true },
  { id: "google", label: "Continue with Google", dark: false },
] as const;

function Mark({ id }: { id: "apple" | "google" }) {
  if (id === "apple")
    return (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.33-3.53zM14.18 6.13c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.69-.93 2.69.98.08 1.98-.5 2.59-1.23z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.92l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1h-4a12 12 0 0 0 0 10.76l4-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77z" />
    </svg>
  );
}

// Apple and Google buttons. A provider that isn't set up yet says so instead of opening an error page.
export function SocialLogin({ onError }: { onError: (msg: string) => void }) {
  const [busy, setBusy] = useState("");

  async function go(id: "apple" | "google", label: string) {
    if (!supabase) return;
    setBusy(id);
    const on = await enabledProviders();
    if (!on[id]) {
      setBusy("");
      return onError(`${label.replace("Continue with ", "")} login is coming soon. Use your email for now.`);
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: id, options: { redirectTo: `${location.origin}/` } });
    if (error) {
      setBusy("");
      onError(error.message);
    }
  }

  return (
    <div className="space-y-3">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => go(p.id, p.label)}
          disabled={!!busy}
          className={`flex h-14 w-full items-center justify-center gap-3 rounded-[16px] text-[16px] font-bold disabled:opacity-60 ${p.dark ? "bg-ink text-white" : "border-2 border-line bg-surface text-ink"}`}
        >
          <Mark id={p.id} />
          {busy === p.id ? "Opening…" : p.label}
        </button>
      ))}
    </div>
  );
}

export function OrLine() {
  return (
    <div className="my-6 flex items-center gap-3 text-[13px] font-bold text-muted">
      <span className="h-px flex-1 bg-line" />
      or with your email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
