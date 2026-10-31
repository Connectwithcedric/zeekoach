"use client";

import Link from "next/link";
import { FollowSuggestions } from "@/components/suggestions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, MapPin, Pencil } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { followCounts } from "@/components/follow-toggle";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Card, RightRailFooter, ThreeColumns } from "@/components/ui";
import { roleLabel } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { MySessions } from "./my-sessions";

export function MyProfile() {
  const router = useRouter();
  const { ready, user, profile } = useAuth();
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const uid = user?.id;
  useEffect(() => {
    if (uid) followCounts(uid).then(setCounts);
  }, [uid]);

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
            <Link href={`/profile/${profile.id}`} className="text-xs font-bold text-primary">See your public profile</Link>
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
            <MeLinks />
            <div className="mt-5 grid w-full grid-cols-3 rounded-[14px] bg-bg py-3 text-center">
              {([["Followers", counts.followers], ["Following", counts.following], ["Subscribers", 0]] as const).map(([l, n]) => (
                <div key={l}><p className="text-[15px] font-bold">{n}</p><p className="text-[11px] font-semibold text-muted">{l}</p></div>
              ))}
            </div>
            <p className="mt-5 text-[13px] font-semibold leading-relaxed text-muted">{profile.bio || "No bio yet. Tell people what you love to train."}</p>
          </div>
        </Card>
      }
      center={<MySessions userId={user.id} isKoach={isKoach} />}
      right={<><FollowSuggestions /><RightRailFooter /></>}
    />
  );
}

// Shortcuts to the pages that aren't in the top bar.
function MeLinks() {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle().then(({ data }) => setAdmin(!!data));
  }, [user]);
  const links = [["/bookings", "My bookings"], ["/notifications", "Notifications"], ["/settings/account", "Settings"], ...(admin ? [["/admin", "Admin"]] : [])];
  return (
    <nav className="mt-4 flex w-full flex-wrap justify-center gap-2">
      {links.map(([href, label]) => (
        <Link key={href} href={href} className="rounded-full bg-bg px-3 py-1.5 text-[12px] font-bold text-primary hover:bg-primary-soft">{label}</Link>
      ))}
    </nav>
  );
}
