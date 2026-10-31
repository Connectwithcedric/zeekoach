"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type Plan = { id: string; name: string; description: string; features: string[]; price: number; interval: "month" | "year" };
type Sub = { plan_id: string | null; status: string; current_period_end: string | null; cancel_at_period_end: boolean };

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" }) : "");

// Koach plans set up by the zKoach team: subscribe, use a coupon, cancel or restart.
export function Plans() {
  const router = useRouter();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Sub | null>(null);
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.from("plans").select("id, name, description, features, price, interval").order("sort").order("price").then(({ data }) => alive && setPlans((data ?? []) as Plan[]));
    (async () => {
      if (!user) return;
      const back = new URLSearchParams(window.location.search).get("subscribed");
      if (back) {
        const r = await api("/api/subscribe/confirm", { checkoutId: back });
        if (alive) setMsg(r.error ?? "You're subscribed. Thank you!");
        window.history.replaceState(null, "", "/upgrade");
      }
      const { data } = await supabase!.from("subscriptions").select("plan_id, status, current_period_end, cancel_at_period_end").eq("user_id", user.id).maybeSingle();
      if (alive) setSub((data as Sub) ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!plans.length) return null;
  const current = sub && ["active", "trialing", "past_due"].includes(sub.status) ? sub : null;

  async function subscribe(id: string) {
    if (!user) return router.push("/login");
    setBusy(id);
    const r = await api<{ url?: string }>("/api/subscribe", { planId: id, coupon });
    if (r.url) return window.location.assign(r.url);
    setBusy("");
    setMsg(r.error ?? "Couldn't start the payment.");
  }
  async function manage(action: "cancel" | "restart") {
    setBusy(action);
    const r = await api<{ cancelAtPeriodEnd?: boolean }>("/api/subscribe/manage", { action });
    setBusy("");
    if (r.error) return setMsg(r.error);
    setSub((s) => (s ? { ...s, cancel_at_period_end: !!r.cancelAtPeriodEnd } : s));
    setMsg(action === "cancel" ? "Your plan stops at the end of this period." : "Your plan keeps going.");
  }

  return (
    <section className="mx-auto mt-[30px] max-w-[980px]">
      <h1 className="text-center text-[22px] font-bold">Plans for Koaches</h1>
      {msg && <p className="mx-auto mt-3 max-w-[480px] rounded-[10px] bg-primary-soft px-3 py-2 text-center text-[13px] font-semibold text-primary">{msg}</p>}
      <div className="mt-6 grid gap-[20px] sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const mine = current?.plan_id === p.id;
          return (
            <article key={p.id} className={`flex flex-col rounded-card bg-surface p-[25px] ${mine ? "ring-2 ring-primary" : ""}`}>
              <h2 className="text-[17px] font-bold">{p.name}</h2>
              <p className="mt-1 text-[26px] font-extrabold text-primary">${Number(p.price)}<span className="text-[13px] font-bold text-muted"> / {p.interval}</span></p>
              {p.description && <p className="mt-2 text-[13px] font-semibold text-muted">{p.description}</p>}
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => <li key={f} className="flex gap-2 text-[13px] font-semibold"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}</li>)}
              </ul>
              {mine ? (
                <div className="mt-5 space-y-2">
                  <p className="text-[12px] font-semibold text-muted">{current!.cancel_at_period_end ? `Ends on ${day(current!.current_period_end)}` : `Renews on ${day(current!.current_period_end)}`}</p>
                  <button disabled={!!busy} onClick={() => manage(current!.cancel_at_period_end ? "restart" : "cancel")} className="h-10 w-full rounded-[10px] bg-bg text-[13px] font-bold text-primary">
                    {current!.cancel_at_period_end ? "Restart plan" : "Cancel plan"}
                  </button>
                </div>
              ) : (
                <button disabled={!!busy} onClick={() => subscribe(p.id)} className="mt-5 h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:opacity-60">
                  {busy === p.id ? "Opening Stripe…" : current ? "Switch to this plan" : "Subscribe"}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <label className="mx-auto mt-4 flex max-w-[320px] items-center gap-2 rounded-[12px] bg-surface px-4 py-2 text-[13px] font-semibold">
        Coupon
        <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} maxLength={30} placeholder="Optional" className="min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-semibold placeholder:text-muted" />
      </label>
    </section>
  );
}
