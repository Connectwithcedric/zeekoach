"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { rememberReferral } from "@/lib/referral";

export function Welcome({ code }: { code: string }) {
  const router = useRouter();
  useEffect(() => {
    rememberReferral(code);
    router.replace("/signup");
  }, [code, router]);
  return <p className="mt-20 text-center text-[13px] font-semibold text-muted">Welcome to ZeeKoach…</p>;
}
