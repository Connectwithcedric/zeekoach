"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/auth-ui";
import { ProfileAvatar } from "@/components/profile-avatar";
import { supabase } from "@/lib/supabase";

// The first screen. Signed out: the header with Sign In / Sign Up. Signed in: a placeholder until Home is built.
export function Start() {
  const router = useRouter();
  const { ready, user, profile } = useAuth();

  // Someone who just confirmed their email lands here: send them to finish their profile.
  useEffect(() => {
    if (user && profile && !profile.onboarded) router.replace("/onboarding");
  }, [user, profile, router]);

  return (
    <div className="min-h-dvh">
      <header className="flex h-[70px] items-center justify-between bg-surface px-5 sm:px-10">
        <Logo />
        {ready && !user && (
          <nav className="flex gap-2 text-[14px] font-bold sm:gap-3">
            <Link href="/login" className="rounded-[10px] px-4 py-2.5 text-primary hover:bg-primary-soft sm:px-5">Sign In</Link>
            <Link href="/signup" className="rounded-[10px] bg-primary px-4 py-2.5 text-white hover:bg-primary-strong sm:px-5">Sign Up</Link>
          </nav>
        )}
        {user && profile && (
          <div className="flex items-center gap-3">
            <ProfileAvatar profile={profile} size={38} />
            <button type="button" onClick={() => supabase?.auth.signOut()} className="text-[13px] font-bold text-muted hover:text-ink">Log out</button>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-[1100px] px-5 pt-16 sm:px-10 sm:pt-24">
        {user ? (
          <>
            <h1 className="text-[34px] font-extrabold leading-tight tracking-tight sm:text-[44px]">Hi {profile?.name.split(" ")[0] || "there"}, you&apos;re in.</h1>
            <p className="mt-4 text-[16px] font-semibold text-muted">Your account works. The home screen is the next one we build from the Figma.</p>
          </>
        ) : (
          <>
            <h1 className="max-w-[620px] text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px]">Train with a Koach near you.</h1>
            <p className="mt-5 max-w-[520px] text-[16px] font-semibold text-muted sm:text-[18px]">Find Koaches and sessions for every sport, book in a tap, and share your progress.</p>
            <Link href="/signup" className="mt-8 inline-flex h-[44px] items-center rounded-[12px] bg-primary px-6 text-[14px] font-bold text-white hover:bg-primary-strong">Create an account</Link>
          </>
        )}
      </main>
    </div>
  );
}
