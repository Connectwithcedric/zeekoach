"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Message, Modal, PasswordField } from "@/components/auth-ui";
import { SocialLogin } from "@/components/social-login";
import { supabase } from "@/lib/supabase";

// Figma: Elements > SignIn/SignUp > "Sign In". Logs in with a phone number, username or email, like the old app.
export function LoginForm() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return setError("Accounts aren't switched on in this copy of the app yet.");
    setBusy(true);
    setError("");
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, password }),
    }).then((res) => res.json().catch(() => ({ error: "Sign in failed, try again." })));
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
    <Modal tabs="in">
      <SocialLogin onError={setError} />
      <form onSubmit={onSubmit} className="mt-9 space-y-7">
        <Field placeholder="Phone, Username or Email" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} />
        <div>
          <PasswordField placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Link href="/forgot" className="mt-2 block text-right text-[12px] font-bold text-primary">
            Forgot password?
          </Link>
        </div>
        {error && <Message tone="error">{error}</Message>}
        <Button busy={busy} disabled={!id.trim() || !password}>
          Sign In
        </Button>
      </form>
    </Modal>
  );
}
