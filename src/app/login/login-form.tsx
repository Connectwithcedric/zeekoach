"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BigButton, Input, Message, PasswordInput, Screen } from "@/components/mobile";
import { OrLine, SocialLogin } from "@/components/social-login";
import { supabase } from "@/lib/supabase";

// Log in with a phone number, username or email, like the old app, or with Apple or Google.
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
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: String(form.get("id")), password: String(form.get("password")) }),
    }).then((res) => res.json().catch(() => ({ error: "Log in failed, try again." })));
    if (r.error) {
      setBusy(false);
      return setError(r.error);
    }
    const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
  }

  return (
    <Screen back="/" title="Log in" sub="Welcome back." footer={<>New to ZeeKoach? <Link href="/signup" className="font-bold text-primary">Sign up</Link></>}>
      <SocialLogin onError={setError} />
      <OrLine />
      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          <Input label="Phone, username or email" name="id" autoCapitalize="none" autoCorrect="off" autoComplete="username" required placeholder="you@email.com" />
          <PasswordInput label="Password" name="password" autoComplete="current-password" required placeholder="Your password" />
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
