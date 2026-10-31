"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button, Heading, Message, Modal, PasswordField, Rule } from "@/components/auth-ui";
import { passwordOk, passwordRules } from "@/lib/password";
import { supabase } from "@/lib/supabase";

// Opened from the reset email: the link signs the person in, then they choose a new password.
export function Reset() {
  const router = useRouter();
  const { ready, user } = useAuth();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rules = passwordRules(password);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    if (password !== again) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/");
  }

  if (!ready) return <Modal title="Reset Your Password"><p className="mt-8 text-[12px] font-medium text-[#8b8b9c]">Loading…</p></Modal>;

  if (!user)
    return (
      <Modal title="Reset Your Password">
        <Heading className="mt-8">This link has expired</Heading>
        <p className="mt-2 text-[12px] font-medium text-[#8b8b9c]">Reset links work once and only for a short time. Ask for a new one.</p>
        <div className="mt-10"><Button onClick={() => router.push("/forgot")}>Send a new link</Button></div>
      </Modal>
    );

  return (
    <Modal title="Reset Your Password">
      <form onSubmit={onSubmit}>
        <Heading className="mt-8">Choose a new password</Heading>
        <div className="mt-5 space-y-5">
          <div>
            <PasswordField label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <ul className="mt-3 space-y-2">
              <Rule ok={rules.length}>8 to 30 characters</Rule>
              <Rule ok={rules.mix}>Mix upper-lowercase letters, numbers and special characters</Rule>
            </ul>
          </div>
          <PasswordField label="Type it again" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </div>
        {error && <div className="mt-5"><Message tone="error">{error}</Message></div>}
        <div className="mt-10"><Button busy={busy} disabled={!passwordOk(password) || !again}>Save password</Button></div>
      </form>
    </Modal>
  );
}
