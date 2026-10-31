"use client";

import { useEffect, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { SettingsShell } from "@/components/settings-shell";
import { passwordOk } from "@/lib/password";
import { supabase } from "@/lib/supabase";

// Email, phone and password, like the old app's account settings.
export function AccountSettings() {
  const { user } = useAuth();
  const [phone, setPhone] = useState<{ phone: string | null; verified: boolean } | null>(null);
  const [busy, setBusy] = useState<"" | "email" | "password">("");
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string; for: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase!.from("private_details").select("phone, phone_verified").eq("user_id", user.id).maybeSingle().then(({ data }) => setPhone({ phone: data?.phone ?? null, verified: !!data?.phone_verified }));
  }, [user]);

  async function changeEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setBusy("email");
    const { error } = await supabase!.auth.updateUser({ email }, { emailRedirectTo: `${location.origin}/settings/account` });
    setBusy("");
    setMsg(error ? { tone: "error", text: error.message, for: "email" } : { tone: "ok", text: `We sent a link to ${email}. Tap it to confirm the change.`, for: "email" });
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const current = String(f.get("current")), next = String(f.get("next")), again = String(f.get("again"));
    if (!passwordOk(next)) return setMsg({ tone: "error", text: "Use 8 to 30 characters with upper and lower case, a number and a special character.", for: "password" });
    if (next !== again) return setMsg({ tone: "error", text: "The new passwords don't match.", for: "password" });
    setBusy("password");
    // Check the current password first, like the old app did.
    const check = await supabase!.auth.signInWithPassword({ email: user!.email!, password: current });
    if (check.error) {
      setBusy("");
      return setMsg({ tone: "error", text: "Your current password is wrong.", for: "password" });
    }
    const { error } = await supabase!.auth.updateUser({ password: next });
    setBusy("");
    if (!error) e.currentTarget.reset();
    setMsg(error ? { tone: "error", text: error.message, for: "password" } : { tone: "ok", text: "Password changed.", for: "password" });
  }

  return (
    <SettingsShell title="Account and password">
      <form onSubmit={changeEmail} className="space-y-4">
        <Field label="Email" name="email" type="email" required defaultValue={user?.email ?? ""} />
        {msg?.for === "email" && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
        <SubmitButton busy={busy === "email"}>Change email</SubmitButton>
      </form>
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-[13px] font-bold">Phone</p>
        <p className="mt-2 text-[13px] font-semibold text-muted">
          {phone === null ? "Loading…" : phone.phone ? `${phone.phone} · ${phone.verified ? "verified" : "not verified"}` : "No phone number yet."} Only you can see it.
        </p>
      </div>
      <form onSubmit={changePassword} className="mt-8 space-y-4 border-t border-line pt-6">
        <Field label="Current password" name="current" type="password" required autoComplete="current-password" />
        <Field label="New password" name="next" type="password" required autoComplete="new-password" />
        <Field label="New password again" name="again" type="password" required autoComplete="new-password" />
        {msg?.for === "password" && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
        <SubmitButton busy={busy === "password"}>Change password</SubmitButton>
      </form>
    </SettingsShell>
  );
}
