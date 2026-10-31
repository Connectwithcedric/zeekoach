"use client";

import { useEffect, useState } from "react";
import { Camera, Check, PartyPopper } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BigButton, BigLink, Input, Message, Screen, Select, Steps } from "@/components/mobile";
import { ProfileAvatar } from "@/components/profile-avatar";
import { supabase } from "@/lib/supabase";

const sportsList = [
  "Fitness", "Running", "Tennis", "Padel", "Boxing", "Yoga", "Pilates", "Football", "Basketball", "Swimming",
  "Cycling", "Martial arts", "CrossFit", "Dance", "Climbing", "Golf",
];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => thisYear - 13 - i);

type Step = "details" | "photo" | "sports" | "price" | "welcome";

const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json().catch(() => ({})));

// After the email link (or Apple / Google): finish what's missing, add a photo, pick sports, then welcome.
export function Onboarding() {
  const { ready, user, profile, refresh } = useAuth();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [at, setAt] = useState(0);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [birthday, setBirthday] = useState({ m: 0, d: 0, y: 0 });
  const [sports, setSports] = useState<string[]>([]);
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Decide the steps once, from what the account already has: Apple and Google sign ups have no username or birthday yet.
  useEffect(() => {
    if (!profile || steps) return;
    const p = profile;
    const list: Step[] = [];
    if (!p.username || !p.birthday) list.push("details");
    list.push("photo", "sports");
    if (p.role !== "member") list.push("price");
    setTimeout(() => setSteps(list), 0);
  }, [profile, steps]);

  useEffect(() => {
    if (!username) return;
    const t = setTimeout(() => post("/api/register/check", { username }).then((r) => setUsernameError(r.username ?? "")), 400);
    return () => clearTimeout(t);
  }, [username]);

  if (!ready || (user && profile && !steps)) return <Screen><p className="text-[15px] font-semibold text-muted">Loading…</p></Screen>;
  if (!user || !profile || !steps)
    return (
      <Screen back="/" title="Log in first" sub="Your account is active. Log in to finish setting it up.">
        <div className="mt-auto">
          <BigLink href="/login">Log in</BigLink>
        </div>
      </Screen>
    );

  const step: Step = steps[at] ?? "welcome";
  const koach = profile.role !== "member";
  const { m, d, y } = birthday;
  const birthdayOk = !!(m && d && y) && new Date(y, m - 1, d).getMonth() === m - 1;

  async function save(fields: Record<string, unknown>) {
    if (!supabase || !user) return false;
    setBusy(true);
    setError("");
    const { error } = await supabase.from("profiles").update(fields).eq("id", user.id);
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "This username is taken." : error.message);
      return false;
    }
    return true;
  }

  async function onPhoto(file: File | undefined) {
    if (!supabase || !user || !file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Pick a photo under 5 MB.");
    setUploading(true);
    setError("");
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setUploading(false);
      return setError(`Photo upload failed: ${up.error.message}`);
    }
    await supabase.from("profiles").update({ avatar_url: supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl }).eq("id", user.id);
    await refresh();
    setUploading(false);
  }

  async function next() {
    if (step === "details" && !(await save({ username: username.trim().toLowerCase(), birthday: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` }))) return;
    if (at === steps!.length - 1) {
      if (!(await save({ sports, hourly_rate: koach && rate ? Number(rate) : null, onboarded: true }))) return;
      await refresh();
    }
    setAt(at + 1);
  }

  if (step === "welcome")
    return (
      <main className="flex min-h-dvh flex-col bg-primary px-6 pb-8 pt-24 text-center text-white">
        <div className="mx-auto">
          <ProfileAvatar profile={profile} size={112} />
        </div>
        <PartyPopper className="mx-auto mt-8 size-10 text-yellow" />
        <h1 className="mt-4 text-[30px] font-extrabold leading-tight tracking-tight">Welcome to ZeeKoach, {profile.name.split(" ")[0] || "friend"}!</h1>
        <p className="mt-3 text-[16px] font-semibold text-white/80">Your account is ready. Let&apos;s find you a Koach.</p>
        <div className="mt-auto pt-10">
          <BigLink href="/" light>
            Let&apos;s go
          </BigLink>
        </div>
      </main>
    );

  const copy: Record<Exclude<Step, "welcome">, [string, string]> = {
    details: ["Finish your account", "Pick a username and tell us your birthday."],
    photo: ["Add a profile photo", "So Koaches and friends recognise you."],
    sports: [koach ? "Which sports do you coach?" : "Which sports do you do?", "Pick as many as you like. We use this to show you the right Koaches and sessions."],
    price: ["Your price", "How much for one hour with one person? You can change it any time."],
  };

  const canGo =
    step === "details" ? username.length >= 3 && !usernameError && birthdayOk : step === "sports" ? sports.length > 0 : step === "price" ? !!Number(rate) : true;

  return (
    <Screen back={at > 0 ? () => setAt(at - 1) : undefined} title={copy[step][0]} sub={copy[step][1]}>
      <Steps count={steps.length} at={at} />

      {step === "details" && (
        <div className="mt-8 space-y-4">
          <div>
            <Input label="Username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => { setUsername(e.target.value.replace(/\s/g, "")); setUsernameError(""); }} placeholder="e.g. cedric.runs" />
            {usernameError && <p className="mt-2 text-[13px] font-semibold text-live">{usernameError}</p>}
          </div>
          <div>
            <span className="text-[14px] font-bold">Birthday</span>
            <div className="mt-2 grid grid-cols-[1.6fr_1fr_1.2fr] gap-2">
              <Select label="" aria-label="Month" value={m} onChange={(e) => setBirthday({ ...birthday, m: Number(e.target.value) })}>
                <option value={0} disabled>Month</option>
                {months.map((x, i) => <option key={x} value={i + 1}>{x}</option>)}
              </Select>
              <Select label="" aria-label="Day" value={d} onChange={(e) => setBirthday({ ...birthday, d: Number(e.target.value) })}>
                <option value={0} disabled>Day</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </Select>
              <Select label="" aria-label="Year" value={y} onChange={(e) => setBirthday({ ...birthday, y: Number(e.target.value) })}>
                <option value={0} disabled>Year</option>
                {years.map((x) => <option key={x} value={x}>{x}</option>)}
              </Select>
            </div>
          </div>
        </div>
      )}

      {step === "photo" && (
        <label className="mx-auto mt-10 flex w-fit cursor-pointer flex-col items-center gap-4">
          <span className="relative">
            <ProfileAvatar profile={profile} size={140} />
            <span className="absolute -bottom-1 -right-1 grid size-11 place-items-center rounded-full border-4 border-bg bg-primary text-white">
              <Camera className="size-5" />
            </span>
          </span>
          <span className="text-[15px] font-bold text-primary">{uploading ? "Uploading…" : profile.avatar_url ? "Change photo" : "Choose a photo"}</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
      )}

      {step === "sports" && (
        <div className="mt-8 flex flex-wrap gap-2.5">
          {sportsList.map((s) => {
            const on = sports.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setSports(on ? sports.filter((x) => x !== s) : [...sports, s])}
                className={`flex h-11 items-center gap-1.5 rounded-full border-2 px-4 text-[15px] font-bold ${on ? "border-primary bg-primary text-white" : "border-transparent bg-surface text-ink"}`}
              >
                {on && <Check className="size-4" />}
                {s}
              </button>
            );
          })}
        </div>
      )}

      {step === "price" && (
        <div className="mt-8">
          <label className="block">
            <span className="text-[14px] font-bold">Price per hour</span>
            <span className="mt-2 flex h-16 items-center rounded-[16px] border-2 border-transparent bg-surface px-4 focus-within:border-primary">
              <span className="text-[24px] font-extrabold text-muted">$</span>
              <input value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="40" className="w-full bg-transparent px-2 text-[24px] font-extrabold outline-none placeholder:text-line" />
              <span className="text-[15px] font-bold text-muted">/ hour</span>
            </span>
          </label>
        </div>
      )}

      {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}

      <div className="mt-auto space-y-3 pt-8">
        <BigButton busy={busy || uploading} disabled={!canGo} onClick={next}>
          {step === "photo" && !profile.avatar_url ? "Skip for now" : "Continue"}
        </BigButton>
      </div>
    </Screen>
  );
}
