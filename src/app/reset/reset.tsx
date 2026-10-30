"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { BigButton, BigLink, Message, PasswordInput, Screen } from "@/components/mobile";
import { supabase } from "@/lib/supabase";

// Opened from the reset email: the link signs the person in, then they choose a new password.
export function Reset() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("again"))) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
  }

  if (!ready) return <Screen title="New password"><p className="text-[15px] font-semibold text-muted">Loading…</p></Screen>;

  if (!user)
    return (
      <Screen back="/login" title="This link has expired" sub="Reset links work once and only for a short time. Ask for a new one.">
        <div className="mt-auto">
          <BigLink href="/forgot">Send a new link</BigLink>
        </div>
      </Screen>
    );

  return (
    <Screen title="Choose a new password" sub="You'll use it to log in from now on.">
      <form onSubmit={onSubmit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          <PasswordInput label="New password" name="password" autoComplete="new-password" required minLength={6} placeholder="At least 6 characters" />
          <PasswordInput label="Type it again" name="again" autoComplete="new-password" required minLength={6} />
          {error && <Message tone="error">{error}</Message>}
        </div>
        <div className="mt-auto pt-8">
          <BigButton busy={busy}>Save password</BigButton>
        </div>
      </form>
    </Screen>
  );
}
