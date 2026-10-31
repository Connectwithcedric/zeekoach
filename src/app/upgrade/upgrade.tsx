"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, CalendarClock, Star } from "lucide-react";
import { AuthCard, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

type Application = { sports: string; experience: string; certificates: string; website: string; status: "pending" | "approved" | "declined" };

const perks = [
  { icon: BadgeCheck, text: "A verified ProKoach badge on your profile, sessions and posts" },
  { icon: Star, text: "Listed with ProKoaches, so members looking for experience find you first" },
  { icon: CalendarClock, text: "Everything Koaches get: sessions, bookings, live streams and earnings" },
];
const field = "mt-2 h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2";

// Members become Koaches in one tap; Koaches apply to become verified ProKoaches.
export function Upgrade() {
  const { ready, user, profile, refresh } = useAuth();
  const [app, setApp] = useState<Application | null | undefined>(undefined);
  const [form, setForm] = useState({ sports: "", experience: "", certificates: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    supabase
      .from("prokoach_applications")
      .select("sports, experience, certificates, website, status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setApp((data as Application | null) ?? null);
        if (data) setForm({ sports: data.sports, experience: data.experience, certificates: data.certificates, website: data.website });
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const perksList = (
    <ul className="mb-6 space-y-3">
      {perks.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-3 text-[13px] font-semibold">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-yellow/20 text-[#b98a00]"><Icon className="size-4" /></span>
          <span className="pt-1.5">{text}</span>
        </li>
      ))}
    </ul>
  );

  if (!supabase) return <AuthCard title="Upgrade to ProKoach"><NotConfigured /></AuthCard>;
  if (!ready) return <AuthCard title="Upgrade to ProKoach"><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user || !profile)
    return (
      <AuthCard title="Upgrade to ProKoach" sub="Coach on zKoach and stand out as a verified pro.">
        {perksList}
        <Link href="/signup" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Create an account</Link>
        <p className="mt-4 text-center text-[13px] font-semibold text-muted">Already have one? <Link href="/login" className="font-bold text-primary">Log in</Link></p>
      </AuthCard>
    );

  if (profile.role === "prokoach")
    return (
      <AuthCard title="You're a ProKoach" sub="Your verified badge shows on your profile and sessions.">
        <Link href={`/profile/${user.id}`} className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">See your profile</Link>
      </AuthCard>
    );

  async function becomeKoach() {
    if (!supabase || !user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ role: "koach" }).eq("id", user.id);
    await refresh();
    setBusy(false);
    setMsg(error ? { tone: "error", text: error.message } : { tone: "ok", text: "You're a Koach now. You can create sessions and go live." });
  }

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    setMsg(null);
    const row = { user_id: user.id, sports: form.sports.trim(), experience: form.experience.trim(), certificates: form.certificates.trim(), website: form.website.trim() };
    const { error } = app ? await supabase.from("prokoach_applications").update(row).eq("user_id", user.id) : await supabase.from("prokoach_applications").insert(row);
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: error.message });
    setApp({ ...row, status: "pending" });
    setMsg({ tone: "ok", text: "Application sent. We'll notify you when it's reviewed." });
  }

  if (profile.role === "member")
    return (
      <AuthCard title="Become a Koach" sub="Start coaching first. Once you're a Koach you can apply for ProKoach.">
        {perksList}
        {msg && <div className="mb-4"><FormMessage tone={msg.tone}>{msg.text}</FormMessage></div>}
        <button onClick={becomeKoach} disabled={busy} className="h-11 w-full rounded-[12px] bg-primary text-[14px] font-bold text-white hover:bg-primary-strong disabled:opacity-60">
          {busy ? "Please wait…" : "Become a Koach"}
        </button>
      </AuthCard>
    );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pending = app?.status === "pending";

  return (
    <AuthCard title="Apply for ProKoach" sub={pending ? "Your application is being reviewed. You can still update it." : app?.status === "declined" ? "Your last application wasn't approved." : "Tell us about your coaching. We review every application."}>
      {perksList}
      {app?.status === "declined" ? (
        <FormMessage tone="error">Applications can&apos;t be resubmitted yet. Contact us to be reviewed again.</FormMessage>
      ) : (
        <form onSubmit={apply} className="space-y-5">
          <label className="block">
            <span className="text-[13px] font-bold">Sports you coach</span>
            <input value={form.sports} onChange={set("sports")} required maxLength={120} placeholder="Boxing, HIIT, mobility" className={field} />
          </label>
          <label className="block">
            <span className="text-[13px] font-bold">Experience</span>
            <textarea value={form.experience} onChange={set("experience")} required maxLength={1000} rows={4} placeholder="Years coaching, who you've trained, achievements…" className="mt-2 w-full resize-none rounded-[12px] bg-bg px-4 py-3 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
          </label>
          <label className="block">
            <span className="text-[13px] font-bold">Certificates</span>
            <input value={form.certificates} onChange={set("certificates")} maxLength={300} placeholder="e.g. NASM CPT, UEFA B" className={field} />
          </label>
          <label className="block">
            <span className="text-[13px] font-bold">Website or social link</span>
            <input value={form.website} onChange={set("website")} maxLength={200} type="url" placeholder="https://" className={field} />
          </label>
          {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
          <SubmitButton busy={busy}>{app ? "Update application" : "Apply"}</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
