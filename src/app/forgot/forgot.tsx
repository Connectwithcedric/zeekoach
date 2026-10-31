"use client";

import { useState } from "react";
import { Banner, Button, Field, Heading, Message, Modal } from "@/components/auth-ui";
import { supabase } from "@/lib/supabase";

// Figma: Elements > SignIn/SignUp > "Reset Your Password", then the purple "email sent" strip.
export function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return setError("Accounts aren't switched on in this copy of the app yet.");
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset` });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <Modal title="Reset Your Password" banner={sent ? <Banner>An email has been sent for you to reset your password</Banner> : undefined}>
      <form onSubmit={onSubmit}>
        <Heading className="mt-8">What&apos;s your email?</Heading>
        <div className="mt-3">
          <Field type="email" inputMode="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); }} />
        </div>
        {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}
        <div className="mt-10">
          <Button busy={busy} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())}>{sent ? "Send again" : "Send"}</Button>
        </div>
      </form>
    </Modal>
  );
}
