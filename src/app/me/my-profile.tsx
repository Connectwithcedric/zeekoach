"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, LogOut, MapPin, Pencil } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Card, FollowSuggestions, RightRailFooter, ThreeColumns } from "@/components/ui";
import { roleLabel } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export function MyProfile() {
  const router = useRouter();
  const { ready, user, profile } = useAuth();

  if (!ready) return <AuthCard title="Your profile"><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user || !profile)
    return (
      <AuthCard title="Your profile" sub="Log in or create an account to get your own profile.">
        <div className="flex gap-3">
          <Link href="/login" className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
          <Link href="/signup" className="flex h-11 flex-1 items-center justify-center rounded-[12px] bg-bg text-[14px] font-bold text-primary">Sign up</Link>
        </div>
      </AuthCard>
    );

  const isKoach = profile.role !== "member";

  return (
    <ThreeColumns
      left={
        <Card className="px-[25px] py-[25px]">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <ProfileAvatar profile={profile} size={110} />
              <span className={`absolute inset-x-0 -bottom-2 mx-auto w-fit rounded-[6px] px-2.5 py-0.5 text-[10px] font-bold uppercase ${profile.role === "prokoach" ? "bg-yellow text-ink" : isKoach ? "bg-primary text-white" : "bg-bg text-muted"}`}>
                {roleLabel[profile.role]}
              </span>
            </div>
            <h1 className="mt-5 text-[19px] font-bold">{profile.name || "New member"}</h1>
            {profile.username && <p className="text-[13px] font-semibold text-muted">@{profile.username}</p>}
            {profile.city && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted"><MapPin className="size-3.5" /> {profile.city}</p>}
            <div className="mt-5 flex w-full gap-3">
              <Link href="/settings/profile" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-[13px] font-bold text-white"><Pencil className="size-4" /> Edit</Link>
              <button
                onClick={async () => {
                  await supabase?.auth.signOut();
                  router.push("/");
                }}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] bg-bg text-[13px] font-bold text-primary"
              >
                <LogOut className="size-4" /> Log out
              </button>
            </div>
            <div className="mt-5 grid w-full grid-cols-3 rounded-[14px] bg-bg py-3 text-center">
              {["Followers", "Following", "Subscribers"].map((l) => (
                <div key={l}><p className="text-[15px] font-bold">0</p><p className="text-[11px] font-semibold text-muted">{l}</p></div>
              ))}
            </div>
            <p className="mt-5 text-[13px] font-semibold leading-relaxed text-muted">{profile.bio || "No bio yet. Tell people what you love to train."}</p>
          </div>
        </Card>
      }
      center={
        <Card className="px-8 py-14 text-center">
          <h2 className="text-[17px] font-bold">{isKoach ? "Your sessions" : "Your bookings"}</h2>
          <p className="mx-auto mt-2 max-w-[380px] text-[13px] font-semibold text-muted">
            {isKoach ? "Create your first session so members can find and book you." : "Sessions you book will show up here."}
          </p>
          <Link href="/sessions" className="mt-6 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">
            <CalendarPlus className="size-4" /> {isKoach ? "Create a session" : "Find a session"}
          </Link>
        </Card>
      }
      right={<><FollowSuggestions /><RightRailFooter /></>}
    />
  );
}
