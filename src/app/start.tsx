"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Dumbbell, MapPin, Star } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BigButton, BigLink, Logo } from "@/components/mobile";
import { supabase } from "@/lib/supabase";

const points = [
  { icon: MapPin, text: "Find a Koach near you, any sport" },
  { icon: Dumbbell, text: "Book a session now or later" },
  { icon: Star, text: "Train, rate, share your progress" },
];

// The first screen. Signed out: the welcome screen. Signed in: home (to be built from Cedric's screenshots).
export function Start() {
  const router = useRouter();
  const { ready, user, profile } = useAuth();

  // Someone who just confirmed their email lands here: send them to finish their profile.
  useEffect(() => {
    if (user && profile && !profile.onboarded) router.replace("/onboarding");
  }, [user, profile, router]);

  if (!ready) return <div className="min-h-dvh bg-primary" />;

  if (user)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <Logo />
        <p className="text-[18px] font-bold">Hi {profile?.name || "there"}, you&apos;re in.</p>
        <p className="text-[14px] font-semibold text-muted">The home screen comes next.</p>
        <div className="mt-6 w-full">
          <BigButton onClick={() => supabase?.auth.signOut()}>Log out</BigButton>
        </div>
      </main>
    );

  return (
    <main className="flex min-h-dvh flex-col bg-primary px-6 pb-8 pt-14 text-white">
      <Logo light />
      <h1 className="mt-14 text-[38px] font-extrabold leading-[1.1] tracking-tight">
        Train with a <span className="text-yellow">Koach</span> near you.
      </h1>
      <ul className="mt-10 space-y-4">
        {points.map((p) => (
          <li key={p.text} className="flex items-center gap-3 text-[16px] font-semibold">
            <span className="grid size-10 place-items-center rounded-full bg-white/15">
              <p.icon className="size-5" />
            </span>
            {p.text}
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-3 pt-10">
        <BigLink href="/signup" light>
          Create an account
        </BigLink>
        <Link href="/login" className="flex h-14 w-full items-center justify-center rounded-[16px] border-2 border-white/40 text-[16px] font-bold">
          Log in
        </Link>
      </div>
    </main>
  );
}
