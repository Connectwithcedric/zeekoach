"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";

type Row = Record<string, string | number | boolean | null | string[]>;
type Data = { applications: Row[]; ids: Row[]; withdrawals: Row[]; reports: Row[]; plans: Row[]; coupons: Row[]; admins: Row[]; stats: Record<string, number> };

const tabs = ["Overview", "ProKoach", "ID checks", "Withdrawals", "Reports", "Plans", "Coupons", "Admins"] as const;
const input = "h-10 w-full rounded-[10px] bg-bg px-3 text-[13px] font-semibold outline-none placeholder:text-muted";
const btn = "h-9 rounded-[10px] px-3 text-[12px] font-bold";
const when = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString([], { day: "numeric", month: "short" }) : "");

// The zKoach team's admin page: approvals, payouts, reports, plans and coupons.
export function AdminPanel() {
  const { ready, user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");

  const load = useCallback(async () => {
    const r = await api<Data>("/api/admin", { action: "overview" });
    if (r.error) setError(r.error);
    else setData(r);
  }, []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<Data>("/api/admin", { action: "overview" }).then((r) => {
      if (!alive) return;
      if (r.error) setError(r.error);
      else setData(r);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const act = async (body: object) => {
    const r = await api("/api/admin", body);
    if (r.error) return alert(r.error);
    load();
  };

  if (ready && !user) return <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[13px] font-semibold"><Link href="/login" className="font-bold text-primary">Log in</Link> as an admin.</Card>;
  if (error) return <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[13px] font-semibold text-muted">{error}</Card>;
  if (!data) return <Card className="mx-auto mt-[30px] max-w-[440px] px-8 py-12 text-center text-[13px] font-semibold text-muted">Loading…</Card>;

  const count: Partial<Record<(typeof tabs)[number], number>> = { ProKoach: data.applications.length, "ID checks": data.ids.length, Withdrawals: data.withdrawals.length, Reports: data.reports.length };

  return (
    <div className="mx-auto mt-[30px] max-w-[1100px] space-y-[20px]">
      <div className="flex gap-2 overflow-x-auto rounded-card bg-surface p-[10px]">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-[10px] px-4 py-2 text-[13px] font-bold ${tab === t ? "bg-primary text-white" : "text-muted hover:bg-bg"}`}>
            {t}{count[t] ? ` (${count[t]})` : ""}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-[20px] sm:grid-cols-3">
          {[["People", data.stats.people], ["Koaches", data.stats.koaches], ["Upcoming sessions", data.stats.upcoming], ["Bookings", data.stats.bookings], ["Booked total", `$${Math.round(data.stats.booked_total)}`], ["Subscribers", data.stats.subscribers]].map(([l, v]) => (
            <Card key={String(l)} className="px-[25px] py-[22px]"><p className="text-[12px] font-bold text-muted">{l}</p><p className="mt-1 text-[26px] font-extrabold text-primary">{v}</p></Card>
          ))}
        </div>
      )}

      {tab === "ProKoach" && (
        <List empty="No applications waiting." rows={data.applications} render={(a) => (
          <>
            <div className="min-w-0 flex-1 text-[13px]">
              <Link href={`/profile/${a.user_id}`} className="font-bold hover:text-primary">{a.name || "Member"}</Link>
              <p className="font-semibold text-muted">{a.sports} · {a.experience}</p>
              {a.certificates && <p className="font-semibold text-muted">Certificates: {a.certificates}</p>}
              {a.website && <a href={String(a.website)} target="_blank" rel="noreferrer" className="font-bold text-primary">{a.website}</a>}
            </div>
            <button onClick={() => act({ action: "application", userId: a.user_id, status: "approved" })} className={`${btn} bg-primary text-white`}>Approve</button>
            <button onClick={() => act({ action: "application", userId: a.user_id, status: "declined" })} className={`${btn} bg-bg text-live`}>Decline</button>
          </>
        )} />
      )}

      {tab === "ID checks" && (
        <List empty="No IDs waiting." rows={data.ids} render={(c) => (
          <>
            <div className="min-w-0 flex-1 text-[13px]">
              <Link href={`/profile/${c.user_id}`} className="font-bold hover:text-primary">{c.name || "Member"}</Link>
              <p className="font-semibold text-muted">Sent {when(c.created_at)}</p>
              {c.url ? <a href={String(c.url)} target="_blank" rel="noreferrer" className="font-bold text-primary">Open the ID (10 minutes)</a> : <p className="font-semibold text-muted">Add SUPABASE_SERVICE_ROLE_KEY to Vercel to view IDs here.</p>}
            </div>
            <button onClick={() => act({ action: "identity", userId: c.user_id, status: "approved" })} className={`${btn} bg-primary text-white`}>Verify</button>
            <button onClick={() => act({ action: "identity", userId: c.user_id, status: "rejected", note: prompt("Why? (shown to them)") ?? "" })} className={`${btn} bg-bg text-live`}>Reject</button>
          </>
        )} />
      )}

      {tab === "Withdrawals" && (
        <List empty="No withdrawals waiting." rows={data.withdrawals} render={(w) => (
          <>
            <div className="min-w-0 flex-1 text-[13px]">
              <p className="font-bold">${w.amount} to {w.name}</p>
              <p className="font-semibold text-muted">{w.payout_to} · {when(w.created_at)}</p>
            </div>
            <button onClick={() => act({ action: "withdrawal", id: w.id, status: "paid" })} className={`${btn} bg-primary text-white`}>Mark sent</button>
            <button onClick={() => act({ action: "withdrawal", id: w.id, status: "rejected" })} className={`${btn} bg-bg text-live`}>Return money</button>
          </>
        )} />
      )}

      {tab === "Reports" && (
        <List empty="No open reports." rows={data.reports} render={(r) => (
          <>
            <div className="min-w-0 flex-1 text-[13px]">
              <p className="font-bold">{r.reason} · {r.target_type}</p>
              <p className="font-semibold text-muted">By {r.reporter} · {when(r.created_at)}{r.details ? ` · ${r.details}` : ""}</p>
              {r.target_type === "user" && <Link href={`/profile/${r.target_id}`} className="font-bold text-primary">Open profile</Link>}
              {r.target_type === "post" && <Link href={`/post/${r.target_id}`} className="font-bold text-primary">Open post</Link>}
            </div>
            <button onClick={() => act({ action: "report", id: r.id, status: "reviewed" })} className={`${btn} bg-primary text-white`}>Handled</button>
            <button onClick={() => act({ action: "report", id: r.id, status: "dismissed" })} className={`${btn} bg-bg text-muted`}>Dismiss</button>
          </>
        )} />
      )}

      {tab === "Plans" && <PlansEditor plans={data.plans} onSave={(plan) => act({ action: "plan", plan })} />}
      {tab === "Coupons" && <CouponsEditor coupons={data.coupons} onSave={(coupon) => act({ action: "coupon", coupon })} />}

      {tab === "Admins" && (
        <Card className="px-[25px] py-[22px]">
          <ul className="space-y-2">{data.admins.map((a) => <li key={String(a.user_id)} className="text-[13px] font-semibold"><b>{a.name}</b> · {a.email}</li>)}</ul>
          <form onSubmit={(e) => { e.preventDefault(); const email = new FormData(e.currentTarget).get("email"); act({ action: "admin", email }); e.currentTarget.reset(); }} className="mt-4 flex max-w-[420px] gap-2">
            <input name="email" type="email" required placeholder="Email of their zKoach account" className={input} />
            <button className={`${btn} bg-primary text-white`}>Add admin</button>
          </form>
        </Card>
      )}
    </div>
  );
}

function List({ rows, empty, render }: { rows: Row[]; empty: string; render: (r: Row) => React.ReactNode }) {
  return (
    <Card className="px-[20px] py-[10px]">
      {!rows.length ? <p className="py-10 text-center text-[13px] font-semibold text-muted">{empty}</p> : (
        <ul className="divide-y divide-line">
          {rows.map((r, i) => <li key={String(r.id ?? r.user_id ?? i)} className="flex flex-wrap items-center gap-3 py-3">{render(r)}</li>)}
        </ul>
      )}
    </Card>
  );
}

function PlansEditor({ plans, onSave }: { plans: Row[]; onSave: (p: object) => void }) {
  const blank = { name: "", description: "", features: "", price: "", interval: "month", active: true, sort: "0" };
  const [edit, setEdit] = useState<typeof blank & { id?: string }>(blank);
  return (
    <div className="grid gap-[20px] md:grid-cols-[minmax(0,1fr)_380px]">
      <List empty="No plans yet. Add one on the right." rows={plans} render={(p) => (
        <>
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-bold">{p.name} · ${p.price}/{p.interval} {p.active ? "" : "· hidden"}</p>
            <p className="font-semibold text-muted">{(p.features as string[]).join(" · ")}</p>
          </div>
          <button onClick={() => setEdit({ id: String(p.id), name: String(p.name), description: String(p.description), features: (p.features as string[]).join("\n"), price: String(p.price), interval: String(p.interval), active: !!p.active, sort: String(p.sort) })} className={`${btn} bg-bg text-primary`}>Edit</button>
        </>
      )} />
      <Card className="space-y-3 px-[20px] py-[20px]">
        <h2 className="text-[15px] font-bold">{edit.id ? "Edit plan" : "New plan"}</h2>
        <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Name, e.g. Koach Pro" className={input} />
        <input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Short description" className={input} />
        <textarea value={edit.features} onChange={(e) => setEdit({ ...edit, features: e.target.value })} rows={4} placeholder="One feature per line" className={`${input} h-auto py-2`} />
        <div className="flex gap-2">
          <input value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} type="number" min={0} placeholder="Price $" className={input} />
          <select value={edit.interval} onChange={(e) => setEdit({ ...edit, interval: e.target.value })} className={input}><option value="month">per month</option><option value="year">per year</option></select>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} className="accent-primary" /> Shown on the Plans page</label>
        <p className="text-[11px] font-semibold text-muted">A new price applies to new subscribers. People already subscribed keep their price.</p>
        <button onClick={() => { onSave({ ...edit, features: edit.features.split("\n").map((f) => f.trim()), price: Number(edit.price) }); setEdit(blank); }} disabled={!edit.name || edit.price === ""} className={`${btn} w-full bg-primary text-white disabled:opacity-50`}>Save plan</button>
      </Card>
    </div>
  );
}

function CouponsEditor({ coupons, onSave }: { coupons: Row[]; onSave: (c: object) => void }) {
  const [c, setC] = useState({ code: "", percent_off: "20", months: "1", max_uses: "", expires_at: "" });
  return (
    <div className="grid gap-[20px] md:grid-cols-[minmax(0,1fr)_380px]">
      <List empty="No coupons yet." rows={coupons} render={(x) => (
        <>
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-bold">{x.code} · {x.percent_off}% off for {x.months} {x.months === 1 ? "month" : "months"} {x.active ? "" : "· off"}</p>
            <p className="font-semibold text-muted">Used {x.uses}{x.max_uses ? ` of ${x.max_uses}` : ""}{x.expires_at ? ` · until ${when(x.expires_at)}` : ""}</p>
          </div>
          <button onClick={() => onSave({ ...x, active: !x.active })} className={`${btn} bg-bg text-primary`}>{x.active ? "Turn off" : "Turn on"}</button>
        </>
      )} />
      <Card className="space-y-3 px-[20px] py-[20px]">
        <h2 className="text-[15px] font-bold">New coupon</h2>
        <input value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="CODE" className={input} />
        <div className="flex gap-2">
          <input value={c.percent_off} onChange={(e) => setC({ ...c, percent_off: e.target.value })} type="number" min={1} max={100} placeholder="% off" className={input} />
          <input value={c.months} onChange={(e) => setC({ ...c, months: e.target.value })} type="number" min={1} max={36} placeholder="Months" className={input} />
        </div>
        <div className="flex gap-2">
          <input value={c.max_uses} onChange={(e) => setC({ ...c, max_uses: e.target.value })} type="number" min={1} placeholder="Max uses (optional)" className={input} />
          <input value={c.expires_at} onChange={(e) => setC({ ...c, expires_at: e.target.value })} type="date" aria-label="Expires" className={input} />
        </div>
        <button onClick={() => { onSave({ ...c, percent_off: Number(c.percent_off), months: Number(c.months), max_uses: c.max_uses ? Number(c.max_uses) : null, expires_at: c.expires_at || null, active: true }); setC({ ...c, code: "" }); }} disabled={c.code.length < 3} className={`${btn} w-full bg-primary text-white disabled:opacity-50`}>Save coupon</button>
      </Card>
    </div>
  );
}
