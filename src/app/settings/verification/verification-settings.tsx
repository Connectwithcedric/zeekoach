"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Upload } from "lucide-react";
import { FormMessage } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { SettingsShell } from "@/components/settings-shell";
import { supabase } from "@/lib/supabase";

type Check = { status: "pending" | "approved" | "rejected"; note: string; created_at: string };

// Send a photo of an ID. zKoach checks it by hand and gives the verified badge. The photo stays private.
export function VerificationSettings() {
  const { user } = useAuth();
  const [check, setCheck] = useState<Check | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase!.from("identity_checks").select("status, note, created_at").eq("user_id", user.id).maybeSingle().then(({ data }) => setCheck((data as Check) ?? null));
  }, [user]);

  async function send(file: File | undefined) {
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) return setError("Pick a file under 10 MB.");
    setBusy(true);
    setError("");
    const path = `${user.id}/id-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const up = await supabase!.storage.from("ids").upload(path, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      return setError(`Upload failed: ${up.error.message}`);
    }
    const row = { user_id: user.id, doc_path: path, status: "pending" as const, note: "", created_at: new Date().toISOString() };
    const { error } = check ? await supabase!.from("identity_checks").update(row).eq("user_id", user.id) : await supabase!.from("identity_checks").insert(row);
    setBusy(false);
    if (error) return setError(error.message);
    setCheck({ status: "pending", note: "", created_at: row.created_at });
  }

  return (
    <SettingsShell title="Verification" sub="Verified Koaches get a badge on their profile, so members know who they’re training with.">
      {check === undefined ? (
        <p className="text-[13px] font-semibold text-muted">Loading…</p>
      ) : check?.status === "approved" ? (
        <p className="flex items-center gap-2 text-[14px] font-bold text-primary"><BadgeCheck className="size-5" /> You&apos;re verified.</p>
      ) : check?.status === "pending" ? (
        <FormMessage tone="ok">We got your ID and will check it within 2 business days.</FormMessage>
      ) : (
        <div className="max-w-[420px] space-y-4">
          {check?.status === "rejected" && <FormMessage tone="error">We couldn&apos;t verify the last photo{check.note ? `: ${check.note}` : ""}. Try again with a clear photo.</FormMessage>}
          <p className="text-[13px] font-semibold text-muted">Upload a clear photo of your passport, ID card or driving licence. Only the zKoach team can see it.</p>
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line text-[13px] font-bold text-primary hover:bg-bg">
            <Upload className="size-5" /> {busy ? "Uploading…" : "Choose a photo or PDF"}
            <input type="file" accept="image/*,application/pdf" className="sr-only" disabled={busy} onChange={(e) => send(e.target.files?.[0])} />
          </label>
          {error && <FormMessage tone="error">{error}</FormMessage>}
        </div>
      )}
    </SettingsShell>
  );
}
