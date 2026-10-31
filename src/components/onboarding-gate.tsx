"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

// Someone who just confirmed their email (or signed in with Google / Apple) finishes their profile first.
export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  useEffect(() => {
    if (user && profile && !profile.onboarded && pathname !== "/onboarding") router.replace("/onboarding");
  }, [user, profile, pathname, router]);
  return null;
}
