"use client";

import { useEffect, useState } from "react";
import { Phone, Trash2 } from "lucide-react";
import { Field, FormMessage, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { SettingsShell } from "@/components/settings-shell";
import { supabase } from "@/lib/supabase";

type Contact = { id: string; name: string; relation: string; phone: string };

// Who to call if something happens during a session. Only you can see them.
export function EmergencySettings() {
  const { user } = useAuth();
  const [list, setList] = useState<Contact[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase!.from("emergency_contacts").select("id, name, relation, phone").eq("user_id", user.id).order("created_at").then(({ data }) => setList((data ?? []) as Contact[]));
  }, [user]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    const { data, error } = await supabase!
      .from("emergency_contacts")
      .insert({ user_id: user!.id, name: String(f.get("name")).trim(), relation: String(f.get("relation")).trim(), phone: String(f.get("phone")).trim() })
      .select("id, name, relation, phone")
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    setList((l) => [...(l ?? []), data as Contact]);
    form.reset();
  }

  async function remove(id: string) {
    await supabase!.from("emergency_contacts").delete().eq("id", id);
    setList((l) => l?.filter((c) => c.id !== id) ?? l);
  }

  return (
    <SettingsShell title="Emergency contacts" sub="Who to call if something happens during a session. Only you can see them.">
      <ul className="space-y-2">
        {list === null && <li className="text-[13px] font-semibold text-muted">Loading…</li>}
        {list?.length === 0 && <li className="text-[13px] font-semibold text-muted">No contacts yet.</li>}
        {list?.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-[12px] bg-bg px-4 py-3">
            <Phone className="size-4 text-primary" />
            <span className="min-w-0 flex-1 text-[13px] font-bold">{c.name}{c.relation && <span className="font-semibold text-muted"> · {c.relation}</span>}<span className="block text-[12px] font-semibold text-muted">{c.phone}</span></span>
            <button aria-label={`Remove ${c.name}`} onClick={() => remove(c.id)} className="text-muted hover:text-live"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      {(list?.length ?? 0) < 5 && (
        <form onSubmit={add} className="mt-6 max-w-[420px] space-y-4 border-t border-line pt-6">
          <Field label="Name" name="name" required maxLength={80} />
          <Field label="Relation" name="relation" maxLength={40} placeholder="e.g. Mother, partner" />
          <Field label="Phone" name="phone" type="tel" required minLength={5} maxLength={30} placeholder="+1 555 000 0000" />
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <SubmitButton busy={busy}>Add contact</SubmitButton>
        </form>
      )}
    </SettingsShell>
  );
}
