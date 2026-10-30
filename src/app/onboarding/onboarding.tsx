"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, Check } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BigButton, BigLink, Input, Message, Screen, Steps } from "@/components/mobile";
import { ProfileAvatar } from "@/components/profile-avatar";
import { supabase } from "@/lib/supabase";

const sportsList = [
  "Fitness", "Running", "Tennis", "Padel", "Boxing", "Yoga", "Pilates", "Football", "Basketball", "Swimming",
  "Cycling", "Martial arts", "CrossFit", "Dance", "Climbing", "Golf",
];

// Right after sign up: photo, name and city, then sports, then (Koaches only) the price per hour.
export function Onboarding() {
  const router = useRouter();
  const { ready, user, profile, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!ready) return <Screen><p className="text-[15px] font-semibold text-muted">Loading…</p></Screen>;
  if (!user || !profile)
    return (
      <Screen back="/" title="Log in first" sub="Your account is ready. Log in to set up your profile.">
        <div className="mt-auto">
          <BigLink href="/login">Log in</BigLink>
        </div>
      </Screen>
    );

  const koach = profile.role !== "member";
  const count = koach ? 3 : 2;
  const shownName = name ?? profile.name;

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

  async function finish() {
    if (!supabase || !user) return;
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("profiles")
      .update({ name: shownName.trim(), city: city.trim(), sports, hourly_rate: koach && rate ? Number(rate) : null, onboarded: true })
      .eq("id", user.id);
    setBusy(false);
    if (error) return setError(error.message);
    await refresh();
    router.replace("/");
  }

  const next = () => (step === count - 1 ? finish() : setStep(step + 1));

  return (
    <Screen
      back={step > 0 ? () => setStep(step - 1) : undefined}
      title={["Set up your profile", koach ? "Which sports do you coach?" : "Which sports do you do?", "Your price"][step]}
      sub={[
        koach ? "People see this when they look for a Koach." : "So Koaches and friends recognise you.",
        "Pick as many as you like. We use this to show you the right Koaches and sessions.",
        "How much do you charge for one hour, one person? You can change it any time.",
      ][step]}
    >
      <Steps count={count} at={step} />

      {step === 0 && (
        <div className="mt-8 space-y-5">
          <label className="mx-auto flex w-fit cursor-pointer flex-col items-center gap-3">
            <span className="relative">
              <ProfileAvatar profile={profile} size={104} />
              <span className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full border-[3px] border-bg bg-primary text-white">
                <Camera className="size-4" />
              </span>
            </span>
            <span className="text-[14px] font-bold text-primary">{uploading ? "Uploading…" : profile.avatar_url ? "Change photo" : "Add a photo"}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          <Input label="Name" value={shownName} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your name" />
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" placeholder="Where you train" />
        </div>
      )}

      {step === 1 && (
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

      {step === 2 && (
        <div className="mt-8">
          <label className="block">
            <span className="text-[14px] font-bold">Price per hour</span>
            <span className="mt-2 flex h-16 items-center rounded-[16px] border-2 border-transparent bg-surface px-4 focus-within:border-primary">
              <span className="text-[24px] font-extrabold text-muted">$</span>
              <input value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="40" className="w-full bg-transparent px-2 text-[24px] font-extrabold outline-none placeholder:text-line" />
              <span className="text-[15px] font-bold text-muted">/ hour</span>
            </span>
          </label>
          <p className="mt-3 text-[13px] font-semibold text-muted">ZeeKoach keeps a small fee on each session. The rest goes to you.</p>
        </div>
      )}

      {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}

      <div className="mt-auto space-y-3 pt-8">
        <BigButton busy={busy} disabled={(step === 0 && !shownName.trim()) || (step === 1 && sports.length === 0) || (step === 2 && !Number(rate))} onClick={next}>
          {step === count - 1 ? "Finish" : "Continue"}
        </BigButton>
      </div>
    </Screen>
  );
}
