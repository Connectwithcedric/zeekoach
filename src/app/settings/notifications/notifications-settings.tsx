"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Toggle } from "@/components/controls";
import { SettingsShell } from "@/components/settings-shell";
import { noteGroups } from "@/app/notifications/notifications-page";
import { supabase } from "@/lib/supabase";

// Turn whole kinds of notifications on or off.
export function NotificationsSettings() {
  const { user } = useAuth();
  const [off, setOff] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase!.from("notification_prefs").select("off").eq("user_id", user.id).maybeSingle().then(({ data }) => setOff((data?.off as string[]) ?? []));
  }, [user]);

  async function set(kinds: readonly string[], on: boolean) {
    const next = on ? (off ?? []).filter((k) => !kinds.includes(k)) : [...new Set([...(off ?? []), ...kinds])];
    setOff(next);
    setSaved(false);
    const { error } = await supabase!.from("notification_prefs").upsert({ user_id: user!.id, off: next, updated_at: new Date().toISOString() });
    if (!error) setSaved(true);
  }

  return (
    <SettingsShell title="Notifications" sub="Choose what shows up in your notifications.">
      {off === null ? (
        <p className="text-[13px] font-semibold text-muted">Loading…</p>
      ) : (
        <div className="max-w-[420px]">
          {noteGroups.map((g) => (
            <Toggle key={g.key} label={g.label} checked={!g.kinds.some((k) => off.includes(k))} onChange={(v) => set(g.kinds, v)} />
          ))}
          <p className="mt-4 text-[12px] font-semibold text-muted">{saved ? "Saved." : "Account and safety messages always come through."}</p>
        </div>
      )}
    </SettingsShell>
  );
}
