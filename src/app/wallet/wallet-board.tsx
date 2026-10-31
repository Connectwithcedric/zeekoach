"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { registerProfile } from "@/lib/live-data";
import { referralLink, shareReferral } from "@/lib/referral";
import { supabase, type Profile } from "@/lib/supabase";
import { ArrowDownLeft, Banknote, Copy, CreditCard, Forward, HandCoins, Landmark, Search, Send, Trash2, WalletCards } from "lucide-react";
import { DualRange, Toggle } from "@/components/controls";
import { Modal } from "@/components/modal";
import { MoneyModal, type MoneyMode } from "@/components/money-modal";
import { PillTabs } from "@/components/tabs-bar";
import { Avatar, Card, Fab, OutlineButton, RightRailFooter, ThreeColumns } from "@/components/ui";
import { api } from "@/lib/api";
import { getPerson, showSamples, type Person } from "@/lib/data";

type Tx = { id: string; who: string; text: string; when: string; daysAgo: number; amount: number; channel: "digital" | "cash"; pending?: boolean };

const transactions: Tx[] = [
  { id: "t1", who: "aleksandar", text: "You withdrew to bank", when: "Just now", daysAgo: 0, amount: -750, channel: "digital" },
  { id: "t2", who: "tibere", text: "Tibere Pey sent a refund for “I will teach you tennis”", when: "1 hour ago", daysAgo: 0, amount: 50, channel: "digital" },
  { id: "t3", who: "rajko", text: "Money received by Rajko Orman", when: "Oct 3", daysAgo: 26, amount: 75, channel: "digital" },
  { id: "t4", who: "aleksandar", text: "You credited your account", when: "Sep 17", daysAgo: 42, amount: 100, channel: "digital" },
  { id: "t5", who: "kim", text: "Cash payment from Kim Press", when: "Oct 21", daysAgo: 8, amount: 45, channel: "cash" },
  { id: "t6", who: "marija", text: "Cash payment from Marija Adams", when: "Oct 12", daysAgo: 17, amount: 20, channel: "cash" },
];

type BookingRow = { id: string; total: number; credit_used: number; status: string; created_at: string; user?: Profile | null; session: { title: string; koach_id: string; ends_at: string } | null };
type LedgerRow = { id: string; amount: number; kind: string; note: string; status: string; created_at: string; other: Profile | null };
type GiftRow = { id: string; amount: number; created_at: string; buyer_id: string; recipient_id: string; buyer: Profile | null; recipient: Profile | null };
type RequestRow = { id: string; amount: number; note: string; status: string; created_at: string; requester_id: string; payer_id: string; requester: Profile | null; payer: Profile | null };
type Summary = { balance: number; withdrawable: number; pending: number; gift_left: number };

const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const shortDate = (iso: string) => {
  const d = daysAgo(iso);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
};
// Koaches receive the session price; the 10% service fee and 20% VAT on top go to zKoach and tax.
const koachShare = (total: number) => Math.round((Number(total) / 1.32) * 100) / 100;
const usd = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

const ledgerText = (r: LedgerRow) => {
  const name = r.other?.name || "Someone";
  switch (r.kind) {
    case "topup": return "You added funds";
    case "send": return `You sent money to ${name}`;
    case "receive": return `${name} sent you money`;
    case "tip_sent": return `You tipped ${name}`;
    case "tip_received": return `${name} tipped you`;
    case "withdraw": return r.status === "pending" ? "Withdrawal requested" : "You withdrew to your account";
    default: return "Money returned to your wallet";
  }
};

// Everything that moved money for the signed-in person: wallet, bookings, gift cards and, for Koaches, earnings.
function useRealWallet() {
  const { user } = useAuth();
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<{ txs: Tx[]; summary: Summary; requests: RequestRow[] } | null>(null);
  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    (async () => {
      const db = supabase!;
      const [{ data: mine }, { data: earned }, { data: ledger }, { data: gifts }, { data: reqs }, { data: sum }] = await Promise.all([
        db.from("bookings").select("id, total, credit_used, status, created_at, session:sessions(title, koach_id, ends_at)").eq("user_id", user.id).eq("status", "confirmed"),
        db.from("bookings").select("id, total, credit_used, status, created_at, user:profiles!bookings_user_id_fkey(*), session:sessions!inner(title, koach_id, ends_at)").eq("session.koach_id", user.id).eq("status", "confirmed"),
        db.from("wallet_transactions").select("id, amount, kind, note, status, created_at, other:profiles!wallet_transactions_counterparty_id_fkey(*)").order("created_at", { ascending: false }).limit(200),
        db.from("gift_cards").select("id, amount, created_at, buyer_id, recipient_id, buyer:profiles!gift_cards_buyer_id_fkey(*), recipient:profiles!gift_cards_recipient_id_fkey(*)"),
        db.from("money_requests").select("*, requester:profiles!money_requests_requester_id_fkey(*), payer:profiles!money_requests_payer_id_fkey(*)").eq("status", "pending").order("created_at", { ascending: false }),
        db.rpc("my_wallet"),
      ]);
      const txs: Tx[] = [];
      const add = (id: string, who: string, text: string, iso: string, amount: number, pending = false) => txs.push({ id, who, text, when: shortDate(iso), daysAgo: daysAgo(iso), amount, channel: "digital", pending });
      for (const b of (mine ?? []) as unknown as BookingRow[]) if (b.session) add(`p-${b.id}`, b.session.koach_id, `You booked “${b.session.title}”`, b.created_at, -Number(b.total));
      for (const b of (earned ?? []) as unknown as BookingRow[]) {
        if (!b.session || !b.user) continue;
        registerProfile(b.user);
        add(`e-${b.id}`, b.user.id, `${b.user.name || "Someone"} booked “${b.session.title}”${new Date(b.session.ends_at) > new Date() ? " (pending)" : ""}`, b.created_at, koachShare(b.total), new Date(b.session.ends_at) > new Date());
      }
      for (const r of (ledger ?? []) as unknown as LedgerRow[]) {
        if (r.other) registerProfile(r.other);
        add(`w-${r.id}`, r.other?.id ?? user.id, ledgerText(r) + (r.note && r.kind !== "topup" && r.kind !== "withdraw" ? `: ${r.note}` : ""), r.created_at, Number(r.amount), r.status === "pending");
      }
      for (const g of (gifts ?? []) as unknown as GiftRow[]) {
        const got = g.recipient_id === user.id;
        const other = got ? g.buyer : g.recipient;
        if (other) registerProfile(other);
        add(`g-${g.id}`, other?.id ?? user.id, got ? `${other?.name ?? "Someone"} sent you a gift card` : `You sent ${other?.name ?? "someone"} a gift card`, g.created_at, got ? Number(g.amount) : -Number(g.amount));
      }
      ((reqs ?? []) as unknown as RequestRow[]).forEach((r) => [r.requester, r.payer].forEach((p) => p && registerProfile(p)));
      txs.sort((a, b) => a.daysAgo - b.daysAgo);
      const s = ((sum ?? []) as Summary[])[0] ?? { balance: 0, withdrawable: 0, pending: 0, gift_left: 0 };
      if (alive) setData({ txs, summary: { balance: Number(s.balance), withdrawable: Number(s.withdrawable), pending: Number(s.pending), gift_left: Number(s.gift_left) }, requests: (reqs ?? []) as unknown as RequestRow[] });
    })();
    return () => {
      alive = false;
    };
  }, [user, version]);
  return { data, reload: useCallback(() => setVersion((v) => v + 1), []) };
}

const demoBalance = showSamples ? 2966 : 0;
const frames = ["Always", "This Month", "Last Month", "Custom"] as const;

export function WalletBoard() {
  const [channel, setChannel] = useState<"digital" | "cash">("digital");
  const [query, setQuery] = useState("");
  const [frame, setFrame] = useState<(typeof frames)[number]>("Always");
  const [dirIn, setIn] = useState(true);
  const [dirOut, setOut] = useState(true);
  const [range, setRange] = useState<[number, number]>([0, 800]);
  const [panel, setPanel] = useState<null | "add" | "withdraw" | "cards" | MoneyMode>(null);
  const [flash, setFlash] = useState("");
  const { data: real, reload } = useRealWallet();
  const { user: me } = useAuth();
  const router = useRouter();
  const balance = real?.summary.balance ?? (me ? 0 : demoBalance);

  // Coming back from Stripe after adding funds or a card.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const topup = q.get("topup");
    const t = setTimeout(() => {
      if (q.get("add")) setPanel("add");
      if (q.get("card")) setFlash("Card saved.");
    }, 0);
    if (topup && me) {
      api<{ added?: number }>("/api/wallet/topup/confirm", { checkoutId: topup }).then((r) => {
        setFlash(r.error ?? `Added ${usd(r.added ?? 0)} to your wallet.`);
        window.history.replaceState(null, "", "/wallet");
        reload();
      });
    }
    return () => clearTimeout(t);
  }, [me, reload]);

  const done = (msg: string) => {
    setFlash(msg);
    reload();
  };

  const visible = (real?.txs ?? (showSamples && !me ? transactions : [])).filter((t) => {
    const abs = Math.abs(t.amount);
    if (t.channel !== channel) return false;
    if (query && !t.text.toLowerCase().includes(query.toLowerCase())) return false;
    if (frame === "This Month" && t.daysAgo > 28) return false;
    if (frame === "Last Month" && (t.daysAgo <= 28 || t.daysAgo > 59)) return false;
    if (t.amount > 0 && !dirIn) return false;
    if (t.amount < 0 && !dirOut) return false;
    return abs >= range[0] && abs <= range[1];
  });

  const forMe = (real?.requests ?? []).filter((r) => r.payer_id === me?.id);
  const asked = (real?.requests ?? []).filter((r) => r.requester_id === me?.id);

  const left = (
    <>
      <OutlineButton href="/locations/new">Manage a location</OutlineButton>
      <Card className="px-[25px] py-[22px]">
        <div className="flex items-center justify-between text-[13px] font-bold text-primary">
          <span>Balance</span>
          <span>{usd(balance)}</span>
        </div>
        {real && real.summary.gift_left > 0 && (
          <p className="mt-1 flex justify-between text-xs font-semibold text-muted"><span>Gift credit (for bookings)</span><span>{usd(real.summary.gift_left)}</span></p>
        )}
        {real && real.summary.pending > 0 && (
          <p className="mt-1 flex justify-between text-xs font-semibold text-muted"><span>Pending (sessions not done yet)</span><span>{usd(real.summary.pending)}</span></p>
        )}
        <ul className="mt-[18px] space-y-[14px] text-[13px] font-semibold text-muted">
          {([
            { label: "Payment Methods", Icon: CreditCard, p: "cards" },
            { label: "Add Fund", Icon: WalletCards, p: "add" },
            { label: "Send Money", Icon: Send, p: "send" },
            { label: "Request Money", Icon: ArrowDownLeft, p: "request" },
            { label: "Withdraw", Icon: Landmark, p: "withdraw" },
          ] as const).map(({ label, Icon, p }) => (
            <li key={label}>
              <button onClick={() => (me ? setPanel(p) : router.push("/login"))} className="flex items-center gap-3 hover:text-primary">
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            </li>
          ))}
        </ul>
        {flash && <p className="mt-4 rounded-[10px] bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">{flash}</p>}
      </Card>
      <Card className="px-[25px] pb-[25px] pt-[21px]">
        <h2 className="text-[15px] font-bold">Filters</h2>
        <label className="mt-[18px] flex h-10 items-center gap-2 rounded-[12px] bg-bg px-4 text-[13px] text-muted">
          <Search className="size-4" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full bg-transparent font-semibold text-ink outline-none placeholder:text-muted" />
        </label>
        <p className="mt-[22px] text-[13px] font-bold">Time frame</p>
        {frames.map((f) => (
          <Toggle key={f} label={f} checked={frame === f} onChange={() => setFrame(f)} />
        ))}
        <p className="mt-[18px] text-[13px] font-bold">Transaction type</p>
        <Toggle label="In" checked={dirIn} onChange={setIn} />
        <Toggle label="Out" checked={dirOut} onChange={setOut} />
        <DualRange label="Transaction range" min={0} max={800} step={5} value={range} onChange={setRange} format={(v) => `$${v}`} />
      </Card>
    </>
  );

  const center = (
    <>
      {forMe.map((r) => (
        <Card key={r.id} className="flex items-center gap-3 px-[20px] py-[16px]">
          {r.requester && getPerson(r.requester.id) && <Avatar person={getPerson(r.requester.id) as Person} size={40} />}
          <p className="min-w-0 flex-1 text-[13px] font-semibold text-muted">
            <b className="text-ink">{r.requester?.name}</b> asked you for <b className="text-ink">{usd(r.amount)}</b>{r.note ? `: ${r.note}` : ""}
          </p>
          <button onClick={async () => { const x = await api("/api/wallet/send", { requestId: r.id }); done(x.error ?? `Paid ${usd(r.amount)}.`); }} className="h-9 rounded-[10px] bg-primary px-4 text-[12px] font-bold text-white">Pay</button>
          <button onClick={async () => { const { error } = await supabase!.rpc("answer_money_request", { rid: r.id, answer: "declined" }); done(error?.message ?? "Request declined."); }} className="h-9 rounded-[10px] bg-bg px-3 text-[12px] font-bold text-muted">Decline</button>
        </Card>
      ))}
      <PillTabs
        options={[
          { v: "digital", label: "Digital", Icon: CreditCard },
          { v: "cash", label: "Cash", Icon: Banknote },
        ]}
        onChange={setChannel}
      />
      <Card className="min-h-[290px] px-[15px] py-[15px]">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-[13px] font-semibold text-muted">{real && !real.txs.length ? "No transactions yet. Money you add, send, receive or spend on bookings shows up here." : "No transactions match these filters."}</p>
        ) : (
          <ul className="space-y-[5px]">
            {visible.map((t) => (
              <li key={t.id} className="flex items-center gap-[15px] rounded-[14px] px-[10px] py-[10px] hover:bg-bg">
                {getPerson(t.who) ? <Avatar person={getPerson(t.who) as Person} size={40} /> : <span className="flex size-10 items-center justify-center rounded-[12px] bg-primary-soft text-primary"><HandCoins className="size-5" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{t.text}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{t.when}{t.pending ? " · Pending" : ""}</p>
                </div>
                <span className={`text-[13px] font-bold ${t.amount < 0 ? "text-ink" : "text-primary"}`}>
                  {t.amount < 0 ? "- " : "+ "}{usd(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );

  const right = (
    <>
      <OutlineButton href="/upgrade">Become a Koach!</OutlineButton>
      <OutlineButton href="/wallet/gift">Send Gift Card</OutlineButton>
      {asked.length > 0 && (
        <Card className="px-[20px] py-[18px]">
          <h2 className="text-[15px] font-bold">Your requests</h2>
          <ul className="mt-3 space-y-3">
            {asked.map((r) => (
              <li key={r.id} className="flex items-center gap-3 text-xs font-semibold text-muted">
                <span className="min-w-0 flex-1 truncate"><b className="text-ink">{usd(r.amount)}</b> from {r.payer?.name}</span>
                <button onClick={async () => { const { error } = await supabase!.rpc("answer_money_request", { rid: r.id, answer: "cancelled" }); done(error?.message ?? "Request cancelled."); }} className="font-bold hover:text-live">Cancel</button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <HelpUsGrow />
      <RightRailFooter />
    </>
  );

  return (
    <>
      <ThreeColumns left={left} center={center} right={right} />
      <Fab />
      {(panel === "send" || panel === "request" || panel === "tip") && <MoneyModal mode={panel} onClose={() => setPanel(null)} onDone={done} />}
      {panel === "add" && <AddFunds onClose={() => setPanel(null)} />}
      {panel === "withdraw" && <Withdraw max={real?.summary.withdrawable ?? 0} onClose={() => setPanel(null)} onDone={done} />}
      {panel === "cards" && <Cards onClose={() => setPanel(null)} />}
    </>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal label={title} onClose={onClose}>
      <div className="w-[400px] max-w-full rounded-[10px] bg-surface p-6">
        <h2 className="text-center text-[15px] font-bold">{title}</h2>
        {children}
      </div>
    </Modal>
  );
}

function AddFunds({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Panel title="Add funds" onClose={onClose}>
      <div className="mt-5 flex gap-2">
        {["20", "50", "100", "200"].map((v) => (
          <button key={v} onClick={() => setAmount(v)} className={`h-9 flex-1 rounded-[10px] text-[13px] font-bold ${amount === v ? "bg-primary text-white" : "bg-bg text-ink"}`}>${v}</button>
        ))}
      </div>
      <label className="mt-4 flex h-11 items-center gap-1 rounded-[12px] bg-bg px-4 text-[14px] font-bold">
        $<input type="number" min={5} max={1000} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" className="w-full bg-transparent outline-none" />
      </label>
      <p className="mt-2 text-[11px] font-semibold text-muted">You pay by card on Stripe. Test mode for now, so no real money moves.</p>
      {error && <p className="mt-3 text-[12px] font-semibold text-live">{error}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await api<{ url?: string }>("/api/wallet/topup", { amount: Number(amount) });
          if (r.url) return (window.location.href = r.url);
          setBusy(false);
          setError(r.error ?? "Couldn't start the payment.");
        }}
        className="mt-5 h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:opacity-60"
      >
        {busy ? "Opening Stripe…" : `Add $${amount || 0}`}
      </button>
    </Panel>
  );
}

function Withdraw({ max, onClose, onDone }: { max: number; onClose: () => void; onDone: (m: string) => void }) {
  const [amount, setAmount] = useState(String(Math.floor(max)));
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Panel title="Withdraw" onClose={onClose}>
      <p className="mt-3 text-center text-[12px] font-semibold text-muted">You can withdraw up to {usd(max)}. Gift credit stays for bookings.</p>
      <label className="mt-4 flex h-11 items-center gap-1 rounded-[12px] bg-bg px-4 text-[14px] font-bold">
        $<input type="number" min={10} max={max} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" className="w-full bg-transparent outline-none" />
      </label>
      <input value={to} onChange={(e) => setTo(e.target.value)} maxLength={200} placeholder="Bank account (IBAN) or PayPal email" className="mt-3 h-11 w-full rounded-[12px] bg-bg px-4 text-[13px] font-semibold outline-none placeholder:text-muted" />
      <p className="mt-2 text-[11px] font-semibold text-muted">We send payouts within 3 business days.</p>
      {error && <p className="mt-3 text-[12px] font-semibold text-live">{error}</p>}
      <button
        disabled={busy || max < 10}
        onClick={async () => {
          setBusy(true);
          const r = await api<{ requested?: number }>("/api/wallet/withdraw", { amount: Number(amount), payoutTo: to });
          setBusy(false);
          if (r.error) return setError(r.error);
          onDone(`Withdrawal of ${usd(r.requested ?? 0)} requested.`);
          onClose();
        }}
        className="mt-5 h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:opacity-60"
      >
        {max < 10 ? "You need at least $10" : busy ? "One moment…" : "Withdraw"}
      </button>
    </Panel>
  );
}

type SavedCard = { id: string; brand: string; last4: string; exp: string };
function Cards({ onClose }: { onClose: () => void }) {
  const [cards, setCards] = useState<SavedCard[] | null>(null);
  const [error, setError] = useState("");
  const run = useCallback(async (body: object) => {
    const r = await api<{ cards?: SavedCard[]; url?: string }>("/api/wallet/methods", body);
    if (r.url) return (window.location.href = r.url);
    if (r.error) return setError(r.error);
    setCards(r.cards ?? []);
  }, []);
  useEffect(() => {
    let alive = true;
    api<{ cards?: SavedCard[] }>("/api/wallet/methods", { action: "list" }).then((r) => {
      if (!alive) return;
      if (r.error) setError(r.error);
      setCards(r.cards ?? []);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Panel title="Payment methods" onClose={onClose}>
      <ul className="mt-5 space-y-2">
        {cards === null && <li className="text-center text-[13px] font-semibold text-muted">Loading…</li>}
        {cards?.length === 0 && <li className="text-center text-[13px] font-semibold text-muted">No saved cards yet.</li>}
        {cards?.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-[12px] bg-bg px-4 py-3 text-[13px] font-bold">
            <CreditCard className="size-4 text-primary" />
            <span className="flex-1 capitalize">{c.brand} •••• {c.last4}</span>
            <span className="text-[11px] text-muted">{c.exp}</span>
            <button aria-label="Remove card" onClick={() => run({ action: "remove", id: c.id })} className="text-muted hover:text-live"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-[12px] font-semibold text-live">{error}</p>}
      <button onClick={() => run({ action: "add" })} className="mt-5 h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white">Add a card</button>
    </Panel>
  );
}

export function HelpUsGrow() {
  const { profile } = useAuth();
  const full = profile ? referralLink(profile) : "https://www.zeekoach.com/aleksandar";
  const link = full.replace(/^https?:\/\//, "");
  const [copied, setCopied] = useState(false);
  return (
    <Card className="px-[25px] py-[22px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">Help us grow!</h2>
        <a href="/share" className="text-xs font-bold text-primary">Share &amp; Earn</a>
      </div>
      <p className="mt-3 text-[13px] font-semibold leading-relaxed text-muted">
        Promote zKoach from your favourite social networks and <b className="text-ink">earn lifetime commissions.</b>
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold text-primary">{link}</span>
        <span className="flex gap-2">
          <button
            aria-label="Copy link"
            onClick={() => {
              navigator.clipboard?.writeText(full);
              setCopied(true);
            }}
            className="flex size-8 items-center justify-center rounded-[8px] bg-bg text-primary hover:bg-primary-soft"
          >
            <Copy className="size-4" />
          </button>
          <button
            aria-label="Share link"
            onClick={async () => profile && (await shareReferral(profile)) === "copied" && setCopied(true)}
            className="flex size-8 items-center justify-center rounded-[8px] bg-bg text-primary hover:bg-primary-soft"
          >
            <Forward className="size-4" />
          </button>
        </span>
      </div>
      {copied && <p className="mt-2 text-xs font-semibold text-primary">Link copied</p>}
    </Card>
  );
}
