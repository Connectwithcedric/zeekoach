"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ProfileAvatar } from "@/components/profile-avatar";
import { SettingsShell } from "@/components/settings-shell";
import { supabase, type Profile } from "@/lib/supabase";

type Table = "blocks" | "mutes";
const cols = { blocks: ["blocker_id", "blocked_id"], mutes: ["muter_id", "muted_id"] } as const;

// The people you blocked or muted, with a button to undo each.
export function PrivacySettings() {
  const { user } = useAuth();
  const [lists, setLists] = useState<Record<Table, Profile[] | null>>({ blocks: null, mutes: null });

  useEffect(() => {
    if (!user) return;
    (["blocks", "mutes"] as const).forEach(async (t) => {
      const [me, them] = cols[t];
      const { data } = await supabase!.from(t).select(`${them}`).eq(me, user.id);
      const ids = ((data ?? []) as unknown as Record<string, string>[]).map((r) => r[them]);
      const { data: people } = ids.length ? await supabase!.from("profiles").select("*").in("id", ids) : { data: [] };
      setLists((l) => ({ ...l, [t]: (people ?? []) as Profile[] }));
    });
  }, [user]);

  async function undo(t: Table, id: string) {
    const [me, them] = cols[t];
    await supabase!.from(t).delete().eq(me, user!.id).eq(them, id);
    setLists((l) => ({ ...l, [t]: l[t]?.filter((p) => p.id !== id) ?? null }));
  }

  return (
    <SettingsShell title="Blocked and muted" sub="Blocked people can't see you, follow you, message you or send you money. Muted people stay connected, but you don't see their posts or hear from them.">
      {(["blocks", "mutes"] as const).map((t) => (
        <div key={t} className="mb-8">
          <h2 className="text-[15px] font-bold">{t === "blocks" ? "Blocked" : "Muted"}</h2>
          <ul className="mt-3 space-y-2">
            {lists[t] === null && <li className="text-[13px] font-semibold text-muted">Loading…</li>}
            {lists[t]?.length === 0 && <li className="text-[13px] font-semibold text-muted">No one.</li>}
            {lists[t]?.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-[12px] bg-bg px-3 py-2">
                <ProfileAvatar profile={p} size={36} />
                <Link href={`/profile/${p.id}`} className="flex-1 truncate text-[13px] font-bold hover:text-primary">{p.name || "Member"}</Link>
                <button onClick={() => undo(t, p.id)} className="h-8 rounded-[8px] bg-surface px-3 text-[12px] font-bold text-primary">{t === "blocks" ? "Unblock" : "Unmute"}</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </SettingsShell>
  );
}
