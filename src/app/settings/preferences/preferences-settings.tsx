"use client";

import { useEffect, useState } from "react";
import { FormMessage } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { SettingsShell } from "@/components/settings-shell";
import { supabase } from "@/lib/supabase";

const languages = [["en", "English"], ["fr", "Français"], ["sr", "Srpski"], ["de", "Deutsch"], ["es", "Español"], ["it", "Italiano"]] as const;
const currencies = [["USD", "US dollar ($)"], ["EUR", "Euro (€)"], ["GBP", "British pound (£)"], ["CHF", "Swiss franc"], ["RSD", "Serbian dinar"], ["CAD", "Canadian dollar"]] as const;

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

// Language and currency, saved on the account like the old app.
export function PreferencesSettings() {
  const { user } = useAuth();
  const [v, setV] = useState<{ language: string; currency: string } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase!.from("private_details").select("language, currency").eq("user_id", user.id).maybeSingle().then(({ data }) => setV({ language: data?.language ?? "en", currency: data?.currency ?? "USD" }));
  }, [user]);

  async function save(patch: Partial<{ language: string; currency: string }>) {
    const next = { ...v!, ...patch };
    setV(next);
    const { error } = await supabase!.from("private_details").upsert({ user_id: user!.id, ...next, updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "Saved.");
  }

  return (
    <SettingsShell title="Language and currency" sub="zKoach is in English for now. Your choice is saved and used as other languages and currencies arrive.">
      {!v ? (
        <p className="text-[13px] font-semibold text-muted">Loading…</p>
      ) : (
        <div className="max-w-[420px] space-y-4">
          <Select label="Language" value={v.language} options={languages} onChange={(language) => save({ language })} />
          <Select label="Currency" value={v.currency} options={currencies} onChange={(currency) => save({ currency })} />
          {msg && <FormMessage tone={msg === "Saved." ? "ok" : "error"}>{msg}</FormMessage>}
        </div>
      )}
    </SettingsShell>
  );
}
