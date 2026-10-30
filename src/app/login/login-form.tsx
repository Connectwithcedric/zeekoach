"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BigButton, Input, Message, PasswordInput, Screen } from "@/components/mobile";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return setError("Accounts aren't switched on in this copy of the app yet.");
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: String(form.get("email")).trim(), password: String(form.get("password")) });
    setBusy(false);
    if (error) {
      if (error.code === "email_not_confirmed") return setError("Confirm your email first: tap the link we sent you.");
      return setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
    }
    router.push("/");
  }

  return (
    <Screen back="/" title="Welcome back" sub="Log in to book and train." footer={<>New to ZeeKoach? <Link href="/signup" className="font-bold text-primary">Create an account</Link></>}>
      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          <Input label="Email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="you@email.com" />
          <PasswordInput label="Password" name="password" autoComplete="current-password" required minLength={6} placeholder="Your password" />
          <Link href="/forgot" className="block text-right text-[14px] font-bold text-primary">
            Forgot password?
          </Link>
          {error && <Message tone="error">{error}</Message>}
        </div>
        <div className="mt-auto pt-8">
          <BigButton busy={busy}>Log in</BigButton>
        </div>
      </form>
    </Screen>
  );
}
