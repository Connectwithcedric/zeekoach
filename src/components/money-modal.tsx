"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { PeoplePicker } from "@/components/people-picker";
import { api } from "@/lib/api";
import { supabase, type Profile } from "@/lib/supabase";

export type MoneyMode = "send" | "request" | "tip";

const titles = { send: "Send money", request: "Request money", tip: "Send a tip" } as const;

// Send money, ask someone for money, or tip a Koach, from the wallet balance.
export function MoneyModal({ mode, to, onClose, onDone }: { mode: MoneyMode; to?: Profile; onClose: () => void; onDone?: (msg: string) => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [people, setPeople] = useState<Profile[]>(to ? [to] : []);
  const [amount, setAmount] = useState(mode === "tip" ? "5" : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [short, setShort] = useState(false);

  async function go() {
    const who = people[0];
    const n = Math.round(Number(amount) * 100) / 100;
    if (!who) return setError("Pick someone.");
    if (!(n >= 1)) return setError("Enter an amount of $1 or more.");
    setBusy(true);
    setError("");
    if (mode === "request") {
      const { error } = await supabase!.from("money_requests").insert({ requester_id: user!.id, payer_id: who.id, amount: n, note: note.trim() });
      setBusy(false);
      if (error) return setError(error.message);
      onDone?.(`Asked ${who.name} for $${n}.`);
      return onClose();
    }
    const r = await api<{ sent?: number }>("/api/wallet/send", { to: who.id, amount: n, note: note.trim(), tip: mode === "tip" });
    setBusy(false);
    if (r.error) {
      setShort(/Not enough/.test(r.error));
      return setError(r.error);
    }
    onDone?.(`${mode === "tip" ? "Tipped" : "Sent"} ${who.name} $${n}.`);
    onClose();
  }

  return (
    <Modal label={titles[mode]} onClose={onClose}>
      <div className="w-[400px] max-w-full rounded-[10px] bg-surface p-6">
        <h2 className="flex items-center justify-center gap-2 text-[15px] font-bold"><HandCoins className="size-5 text-primary" /> {titles[mode]}</h2>
        <div className="mt-5">
          {to ? (
            <p className="rounded-[12px] bg-bg px-4 py-3 text-[13px] font-bold">{mode === "request" ? "From" : "To"} {to.name}</p>
          ) : (
            <PeoplePicker value={people} onChange={(l) => setPeople(l.slice(-1))} exclude={user ? [user.id] : []} placeholder={mode === "request" ? "Who should pay?" : "Who to send to?"} />
          )}
        </div>
        {mode === "tip" && (
          <div className="mt-4 flex gap-2">
            {["2", "5", "10", "20"].map((v) => (
              <button key={v} onClick={() => setAmount(v)} className={`h-9 flex-1 rounded-[10px] text-[13px] font-bold ${amount === v ? "bg-primary text-white" : "bg-bg text-ink"}`}>${v}</button>
            ))}
          </div>
        )}
        <label className="mt-4 flex h-11 items-center gap-1 rounded-[12px] bg-bg px-4 text-[14px] font-bold">
          $<input type="number" min={1} max={5000} step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" aria-label="Amount" className="w-full bg-transparent outline-none" />
        </label>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={mode === "tip" ? "Say thanks (optional)" : "What's it for? (optional)"} className="mt-3 h-11 w-full rounded-[12px] bg-bg px-4 text-[13px] font-semibold outline-none placeholder:text-muted" />
        {error && <p className="mt-3 text-[12px] font-semibold text-live">{error}</p>}
        {short && <button onClick={() => router.push("/wallet?add=1")} className="mt-2 text-[12px] font-bold text-primary">Add funds</button>}
        <button disabled={busy} onClick={go} className="mt-5 h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:opacity-60">
          {busy ? "One moment…" : mode === "request" ? "Send request" : mode === "tip" ? "Send tip" : "Send"}
        </button>
      </div>
    </Modal>
  );
}

// "Tip" on a Koach's profile or a finished booking.
export function TipButton({ to, className = "" }: { to: { id: string; name: string }; className?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  if (user?.id === to.id) return null;
  return (
    <>
      <button type="button" onClick={() => (user ? setOpen(true) : router.push("/login"))} className={className || "flex items-center gap-1.5 text-[13px] font-bold text-primary"}>
        <HandCoins className="size-4" /> {msg || "Tip"}
      </button>
      {open && <MoneyModal mode="tip" to={to as Profile} onClose={() => setOpen(false)} onDone={setMsg} />}
    </>
  );
}
