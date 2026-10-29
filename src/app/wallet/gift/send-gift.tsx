"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Gift, Search, X } from "lucide-react";
import { AuthCard, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { Avatar } from "@/components/ui";
import { getPerson, type Person } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

const amounts = [25, 50, 100];

async function api(path: string, body: object) {
  const token = (await supabase!.auth.getSession()).data.session?.access_token;
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return (await res.json()) as { url?: string; sent?: boolean; recipientId?: string; amount?: number; error?: string };
}

async function findPerson(id: string) {
  const { data } = await supabase!.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  registerProfile(data as Profile);
  return getPerson(id) ?? null;
}

// Pick a member, an amount and a note, then pay with Stripe. The credit is spent on their next bookings.
export function SendGift() {
  const params = useSearchParams();
  const paid = params.get("paid");
  const preset = params.get("to");
  const { ready, user } = useAuth();
  const [to, setTo] = useState<Person | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [amount, setAmount] = useState(50);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [done, setDone] = useState<{ name: string; amount: number } | null>(null);

  useEffect(() => {
    if (!supabase || !preset) return;
    let alive = true;
    findPerson(preset).then((p) => alive && p && setTo(p));
    return () => {
      alive = false;
    };
  }, [preset]);

  // Coming back from Stripe: save the gift card.
  useEffect(() => {
    if (!supabase || !user || !paid) return;
    let alive = true;
    api("/api/gift/confirm", { checkoutId: paid }).then(async (r) => {
      if (!alive) return;
      if (r.error || !r.recipientId) return setMsg({ tone: "error", text: r.error ?? "Something went wrong." });
      const p = await findPerson(r.recipientId);
      if (alive) setDone({ name: p?.name ?? "your friend", amount: r.amount ?? 0 });
    });
    return () => {
      alive = false;
    };
  }, [user, paid]);

  useEffect(() => {
    const term = query.trim();
    if (!supabase || term.length < 2) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("*")
      .ilike("name", `%${term.replace(/[%_,()]/g, "")}%`)
      .neq("id", user?.id ?? "")
      .limit(6)
      .then(({ data }) => {
        const list = (data as Profile[] | null) ?? [];
        list.forEach(registerProfile);
        if (alive) setFound(list.map((p) => getPerson(p.id)!).filter(Boolean));
      });
    return () => {
      alive = false;
    };
  }, [query, user]);

  if (!supabase) return <AuthCard title="Send a gift card"><NotConfigured /></AuthCard>;
  if (!ready) return <AuthCard title="Send a gift card"><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user)
    return (
      <AuthCard title="Send a gift card" sub="Log in to give someone sessions with their favourite Koach.">
        <Link href="/login" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
      </AuthCard>
    );

  if (paid && !done && !msg)
    return <AuthCard title="Send a gift card"><p className="text-[13px] font-semibold text-muted">Confirming your payment…</p></AuthCard>;

  if (done)
    return (
      <AuthCard title="Gift card sent!" sub={`${done.name} got $${done.amount} to spend on sessions. They'll see it in their notifications and wallet.`}>
        <Link href="/wallet" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Back to wallet</Link>
      </AuthCard>
    );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!to) return setMsg({ tone: "error", text: "Pick who the gift card is for." });
    setBusy(true);
    setMsg(null);
    const r = await api("/api/gift", { recipientId: to.id, amount, message: message.trim() });
    if (r.url) return window.location.assign(r.url);
    setBusy(false);
    setMsg({ tone: "error", text: r.error ?? "Couldn't start the payment." });
  }

  return (
    <AuthCard title="Send a gift card" sub="Their credit is used automatically on their next bookings.">
      <form onSubmit={send} className="space-y-5">
        <div>
          <span className="text-[13px] font-bold">For</span>
          {to ? (
            <div className="mt-2 flex items-center gap-3 rounded-[12px] bg-bg px-3 py-2.5">
              <Avatar person={to} size={34} />
              <span className="flex-1 text-[14px] font-bold">{to.name}</span>
              <button type="button" onClick={() => setTo(null)} aria-label="Change person" className="text-muted hover:text-primary"><X className="size-4" /></button>
            </div>
          ) : (
            <>
              <label className="mt-2 flex h-11 items-center gap-2 rounded-[12px] bg-bg px-4 text-muted">
                <Search className="size-4" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" className="w-full bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:text-muted" />
              </label>
              {query.trim().length >= 2 && (
                <ul className="mt-2 space-y-1">
                  {found.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setTo(p)} className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left hover:bg-bg">
                        <Avatar person={p} size={30} />
                        <span className="text-[13px] font-bold">{p.name}</span>
                      </button>
                    </li>
                  ))}
                  {!found.length && <li className="px-3 py-2 text-[13px] font-semibold text-muted">No one found.</li>}
                </ul>
              )}
            </>
          )}
        </div>
        <div>
          <span className="text-[13px] font-bold">Amount</span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {amounts.map((a) => (
              <button key={a} type="button" onClick={() => setAmount(a)} className={`h-11 rounded-[10px] text-[14px] font-bold ${amount === a ? "bg-primary text-white" : "bg-bg text-primary"}`}>
                ${a}
              </button>
            ))}
            <input
              type="number"
              min={5}
              max={500}
              value={amounts.includes(amount) ? "" : amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Other"
              aria-label="Other amount"
              className="h-11 rounded-[10px] bg-bg px-3 text-center text-[14px] font-bold outline-none ring-primary placeholder:text-muted focus:ring-2"
            />
          </div>
        </div>
        <label className="block">
          <span className="text-[13px] font-bold">Message</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200} rows={2} placeholder="Happy birthday! Enjoy your training 💪" className="mt-2 w-full resize-none rounded-[12px] bg-bg px-4 py-3 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
        </label>
        {msg && <FormMessage tone={msg.tone}>{msg.text}</FormMessage>}
        <SubmitButton busy={busy}>
          <span className="inline-flex items-center gap-2"><Gift className="size-4" /> Pay ${amount || 0}</span>
        </SubmitButton>
        <p className="text-center text-xs font-semibold text-muted">Test mode: pay with card 4242 4242 4242 4242, any future date and any CVC.</p>
      </form>
    </AuthCard>
  );
}
