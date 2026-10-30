"use client";

import { useState } from "react";
import { BigButton, BigLink, Input, Message, Screen } from "@/components/mobile";
import { supabase } from "@/lib/supabase";

export function Forgot() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return setError("Accounts aren't switched on in this copy of the app yet.");
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset` });
    setBusy(false);
    if (error) return setError(error.message);
    setSentTo(email);
  }

  if (sentTo)
    return (
      <Screen back="/login" title="Check your email" sub={<>If <b className="text-ink">{sentTo}</b> has an account, we sent it a link to choose a new password.</>}>
        <div className="mt-auto">
          <BigLink href="/login">Back to log in</BigLink>
        </div>
      </Screen>
    );

  return (
    <Screen back="/login" title="Forgot password?" sub="Type your email and we'll send you a link to choose a new one.">
      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          <Input label="Email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="you@email.com" />
          {error && <Message tone="error">{error}</Message>}
        </div>
        <div className="mt-auto pt-8">
          <BigButton busy={busy}>Send link</BigButton>
        </div>
      </form>
    </Screen>
  );
}
