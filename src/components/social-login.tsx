"use client";

import { useState } from "react";
import { AppleIcon, FacebookIcon, InstagramIcon, TwitterIcon } from "@/components/brand-icons";
import { enabledProviders, supabase } from "@/lib/supabase";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12.24 10.29v3.86h5.38c-.22 1.4-1.63 4.1-5.38 4.1-3.24 0-5.88-2.68-5.88-5.99s2.64-5.99 5.88-5.99c1.84 0 3.08.79 3.78 1.46l2.58-2.48C16.94 3.7 14.8 2.75 12.24 2.75 7.2 2.75 3.12 6.83 3.12 11.87s4.08 9.12 9.12 9.12c5.27 0 8.76-3.7 8.76-8.92 0-.6-.07-1.06-.15-1.51z" />
  </svg>
);

// Same order as the Figma: Facebook, Instagram, Twitter, Google, Apple. Supabase has no Instagram login.
const providers = [
  { id: "facebook", name: "Facebook", Icon: FacebookIcon },
  { id: "instagram", name: "Instagram", Icon: InstagramIcon },
  { id: "twitter", name: "Twitter", Icon: TwitterIcon },
  { id: "google", name: "Google", Icon: GoogleIcon },
  { id: "apple", name: "Apple", Icon: AppleIcon },
] as const;

// A provider that isn't switched on yet says so instead of opening an error page.
export function SocialLogin({ onError }: { onError: (msg: string) => void }) {
  const [busy, setBusy] = useState("");

  async function go(id: string, name: string) {
    if (!supabase) return;
    setBusy(id);
    const on = id === "instagram" ? {} : await enabledProviders();
    if (!on[id]) {
      setBusy("");
      return onError(`${name} login is coming soon. Use your email for now.`);
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider: id as "google", options: { redirectTo: `${location.origin}/onboarding` } });
    if (error) {
      setBusy("");
      onError(error.message);
    }
  }

  return (
    <div className="mt-7 flex justify-between px-1">
      {providers.map(({ id, name, Icon }) => (
        <button
          key={id}
          type="button"
          title={`Continue with ${name}`}
          aria-label={`Continue with ${name}`}
          onClick={() => go(id, name)}
          disabled={!!busy}
          className="grid size-[30px] place-items-center rounded-[8px] bg-[#f4f4ff] text-primary transition hover:bg-primary-soft disabled:opacity-60"
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
