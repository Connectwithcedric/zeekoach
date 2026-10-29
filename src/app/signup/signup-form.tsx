"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, Field, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { supabase } from "@/lib/supabase";

const roles = [
  { v: "member", title: "I want to train", text: "Find Koaches and book sessions" },
  { v: "koach", title: "I'm a Koach", text: "Run sessions and get paid" },
] as const;

export function SignupForm() {
  const router = useRouter();
  const [role, setRole] = useState<"member" | "koach">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    setBusy(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password: String(form.get("password")),
      options: { data: { name: String(form.get("name")).trim(), role }, emailRedirectTo: `${location.origin}/me` },
    });
    setBusy(false);
    if (error) return setError(error.message);
    // With email confirmation on, there's no session until the link is clicked.
    if (data.session) router.push("/settings/profile");
    else setCheckEmail(email);
  }

  if (checkEmail)
    return (
      <AuthCard title="Check your email" sub={<>We sent a link to <b className="text-ink">{checkEmail}</b>. Click it to finish creating your account.</>}>
        <Link href="/login" className="text-[13px] font-bold text-primary">Back to log in</Link>
      </AuthCard>
    );

  return (
    <AuthCard title="Create your account" sub={<>Already have one? <Link href="/login" className="font-bold text-primary">Log in</Link></>}>
      {!supabase ? (
        <NotConfigured />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
            {roles.map((r) => (
              <button
                type="button"
                key={r.v}
                role="radio"
                aria-checked={role === r.v}
                onClick={() => setRole(r.v)}
                className={`rounded-[14px] border-2 p-3 text-left ${role === r.v ? "border-primary bg-primary-soft" : "border-line"}`}
              >
                <span className="block text-[13px] font-bold">{r.title}</span>
                <span className="mt-1 block text-xs font-semibold text-muted">{r.text}</span>
              </button>
            ))}
          </div>
          <Field label="Full name" name="name" autoComplete="name" required />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" name="password" type="password" autoComplete="new-password" required minLength={6} placeholder="At least 6 characters" />
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <SubmitButton busy={busy}>Create account</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
