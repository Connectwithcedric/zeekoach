"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera } from "lucide-react";
import { AuthCard, Field, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { ProfileAvatar } from "@/components/profile-avatar";
import { supabase } from "@/lib/supabase";

export function ProfileSettings() {
  const router = useRouter();
  const { ready, user, profile, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  if (!supabase) return <AuthCard title="Edit profile"><NotConfigured /></AuthCard>;
  if (!ready) return <AuthCard title="Edit profile"><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user || !profile)
    return (
      <AuthCard title="Edit profile" sub="Log in to edit your profile.">
        <Link href="/login" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
      </AuthCard>
    );

  async function onAvatar(file: File | undefined) {
    if (!supabase || !user || !file) return;
    if (file.size > 5 * 1024 * 1024) return setMsg({ tone: "error", text: "Pick a photo under 5 MB." });
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setUploading(false);
      return setMsg({ tone: "error", text: `Photo upload failed: ${up.error.message}` });
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    await refresh();
    setUploading(false);
    setMsg({ tone: "ok", text: "Photo updated." });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !user) return;
    const f = new FormData(e.currentTarget);
    const username = String(f.get("username")).trim().toLowerCase().replace(/[^a-z0-9_.]/g, "") || null;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ name: String(f.get("name")).trim(), username, city: String(f.get("city")).trim(), bio: String(f.get("bio")).trim(), role: f.get("role") === "koach" ? "koach" : "member" })
      .eq("id", user.id);
    const password = String(f.get("password") ?? "");
    const pw = password ? await supabase.auth.updateUser({ password }) : { error: null };
    setBusy(false);
    if (error) return setMsg({ tone: "error", text: error.code === "23505" ? "That username is taken." : error.message });
    if (pw.error) return setMsg({ tone: "error", text: pw.error.message });
    await refresh();
    router.push("/me");
  }

  return (
    <AuthCard title="Edit profile">
      <div className="mb-6 flex items-center gap-4">
        <ProfileAvatar profile={profile} size={72} />
        <label className="flex cursor-pointer items-center gap-2 rounded-[10px] bg-bg px-4 py-2.5 text-[13px] font-bold text-primary hover:bg-primary-soft">
          <Camera className="size-4" /> {uploading ? "Uploading…" : "Change photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onAvatar(e.target.files?.[0])} />
        </label>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" name="name" defaultValue={profile.name} required />
        <Field label="Username" name="username" defaultValue={profile.username ?? ""} placeholder="e.g. aleks.tennis" />
        <Field label="City" name="city" defaultValue={profile.city} placeholder="e.g. Belgrade" />
        <label className="block">
          <span className="text-[13px] font-bold">Bio</span>
          <textarea name="bio" defaultValue={profile.bio} rows={3} maxLength={300} className="mt-2 w-full rounded-[12px] bg-bg px-4 py-3 text-[14px] font-semibold outline-none ring-primary focus:ring-2" />
        </label>
        {profile.role !== "prokoach" && (
          <fieldset>
            <legend className="text-[13px] font-bold">Account type</legend>
            <div className="mt-2 flex gap-5 text-[13px] font-semibold">
              <label className="flex items-center gap-2"><input type="radio" name="role" value="member" defaultChecked={profile.role === "member"} className="accent-primary" /> Member</label>
              <label className="flex items-center gap-2"><input type="radio" name="role" value="koach" defaultChecked={profile.role === "koach"} className="accent-primary" /> Koach</label>
            </div>
          </fieldset>
        )}
        <Field label="New password (optional)" name="password" type="password" autoComplete="new-password" minLength={6} placeholder="Leave empty to keep it" />
        {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
        <SubmitButton busy={busy}>Save</SubmitButton>
      </form>
    </AuthCard>
  );
}
