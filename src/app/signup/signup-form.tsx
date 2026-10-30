"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dumbbell, MailCheck, Whistle } from "lucide-react";
import { BigButton, BigLink, Input, Message, PasswordInput, Screen, Steps } from "@/components/mobile";
import { storedReferral } from "@/lib/referral";
import { supabase } from "@/lib/supabase";

const roles = [
  { v: "member", icon: Dumbbell, title: "I want to train", text: "Find Koaches near me and book sessions" },
  { v: "koach", icon: Whistle, title: "I'm a Koach", text: "Get booked, run sessions and get paid" },
] as const;

type Role = (typeof roles)[number]["v"];

// Sign up in two steps (who you are, then your details), then the confirmation email.
export function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return setError("Accounts aren't switched on in this copy of the app yet.");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    setBusy(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(form.get("password")),
      options: { data: { name: String(form.get("name")).trim(), role, ref: storedReferral() }, emailRedirectTo: `${location.origin}/onboarding` },
    });
    setBusy(false);
    if (error) return setError(error.message);
    // Supabase answers a sign up with an email that already has an account with a user that has no identities.
    if (data.user && data.user.identities?.length === 0) return setError("There's already an account with this email. Log in instead.");
    // With email confirmation on, there's no session until the link is clicked.
    if (data.session) router.push("/onboarding");
    else setCheckEmail(email);
  }

  if (checkEmail)
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
            <MailCheck className="size-9" />
          </span>
          <h1 className="mt-6 text-[26px] font-extrabold tracking-tight">Check your email</h1>
          <p className="mt-2 text-[15px] font-semibold text-muted">
            We sent a link to <b className="text-ink">{checkEmail}</b>. Tap it to confirm your account, then you&apos;ll set up your profile.
          </p>
          <p className="mt-4 text-[13px] font-semibold text-muted">No email? Look in your spam folder.</p>
        </div>
        <BigLink href="/login" light>
          Back to log in
        </BigLink>
      </Screen>
    );

  if (step === 0)
    return (
      <Screen back="/" title="Join ZeeKoach" sub="First, how will you use ZeeKoach? You can switch later." footer={<>Already have an account? <Link href="/login" className="font-bold text-primary">Log in</Link></>}>
        <Steps count={2} at={0} />
        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Account type">
          {roles.map((r) => (
            <button
              type="button"
              key={r.v}
              role="radio"
              aria-checked={role === r.v}
              onClick={() => setRole(r.v)}
              className={`flex w-full items-center gap-4 rounded-[20px] border-2 bg-surface p-5 text-left ${role === r.v ? "border-primary" : "border-transparent"}`}
            >
              <span className={`grid size-12 shrink-0 place-items-center rounded-full ${role === r.v ? "bg-primary text-white" : "bg-primary-soft text-primary"}`}>
                <r.icon className="size-6" />
              </span>
              <span>
                <span className="block text-[17px] font-bold">{r.title}</span>
                <span className="mt-0.5 block text-[14px] font-semibold text-muted">{r.text}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-8">
          <BigButton disabled={!role} onClick={() => setStep(1)}>
            Continue
          </BigButton>
        </div>
      </Screen>
    );

  return (
    <Screen back={() => setStep(0)} title={role === "koach" ? "Create your Koach account" : "Create your account"} sub="It takes a minute.">
      <Steps count={2} at={1} />
      <form onSubmit={onSubmit} className="mt-6 flex flex-1 flex-col">
        <div className="space-y-4">
          <Input label="Full name" name="name" autoComplete="name" required placeholder="Your name" />
          <Input label="Email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="you@email.com" />
          <PasswordInput label="Password" name="password" autoComplete="new-password" required minLength={6} placeholder="At least 6 characters" />
          {error && <Message tone="error">{error}</Message>}
        </div>
        <p className="mt-6 text-[12px] font-semibold text-muted">By creating an account you agree to the ZeeKoach terms and privacy policy.</p>
        <div className="mt-auto pt-6">
          <BigButton busy={busy}>Create account</BigButton>
        </div>
      </form>
    </Screen>
  );
}
