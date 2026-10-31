"use client";

import { supabase, type Profile } from "@/lib/supabase";

const KEY = "zk_ref";

export const referralCode = (p: Pick<Profile, "id" | "username">) => p.username || p.id;
export const referralLink = (p: Pick<Profile, "id" | "username">) => `${typeof window === "undefined" ? "https://zeekoach.vercel.app" : location.origin}/r/${referralCode(p)}`;

export function rememberReferral(code: string) {
  try {
    localStorage.setItem(KEY, code);
  } catch {}
  supabase?.rpc("track_referral", { code, kind: "view" }).then(() => {});
}

export function storedReferral() {
  try {
    return localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

// Opens the phone's share sheet when there is one, otherwise copies the link. Counts as a share either way.
export async function shareReferral(p: Pick<Profile, "id" | "username">, text = "Find a Koach near you and train together on zKoach") {
  const url = referralLink(p);
  supabase?.rpc("track_referral", { code: referralCode(p), kind: "share" }).then(() => {});
  if (navigator.share) {
    try {
      await navigator.share({ title: "zKoach", text, url });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  await navigator.clipboard?.writeText(url);
  return "copied";
}
