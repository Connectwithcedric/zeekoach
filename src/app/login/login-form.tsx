"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, Field, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
    setBusy(false);
    if (error) return setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
    router.push("/me");
  }

  async function forgot(e: React.MouseEvent) {
    e.preventDefault();
    const email = (document.getElementById("email") as HTMLInputElement | null)?.value;
    if (!supabase || !email) return setError("Type your email first, then press “Forgot password?”.");
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/settings/profile` });
    setResetSent(true);
  }

  return (
    <AuthCard title="Welcome back" sub={<>New to ZeeKoach? <Link href="/signup" className="font-bold text-primary">Create an account</Link></>}>
      {!supabase ? (
        <NotConfigured />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required minLength={6} />
          {error && <FormMessage tone="error">{error}</FormMessage>}
          {resetSent && <FormMessage tone="ok">Check your email for a link to reset your password.</FormMessage>}
          <SubmitButton busy={busy}>Log in</SubmitButton>
          <button onClick={forgot} className="w-full text-center text-[13px] font-bold text-primary">Forgot password?</button>
        </form>
      )}
    </AuthCard>
  );
}
