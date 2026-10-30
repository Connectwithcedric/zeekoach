"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { rememberReferral } from "@/lib/referral";

// A friend's invite link: remember who invited them, then straight to sign up.
export function Go({ code }: { code: string }) {
  const router = useRouter();
  useEffect(() => {
    rememberReferral(code);
    router.replace("/signup");
  }, [code, router]);
  return <div className="min-h-dvh bg-primary" />;
}
