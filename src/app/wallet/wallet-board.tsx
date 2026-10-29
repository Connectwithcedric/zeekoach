"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { registerProfile } from "@/lib/live-data";
import { referralLink, shareReferral } from "@/lib/referral";
import { supabase, type Profile } from "@/lib/supabase";
import { Banknote, Copy, CreditCard, Forward, Landmark, Search, WalletCards } from "lucide-react";
import { DualRange, Toggle } from "@/components/controls";
import { PillTabs } from "@/components/tabs-bar";
import { Avatar, Card, Fab, OutlineButton, RightRailFooter, ThreeColumns } from "@/components/ui";
import { getPerson, showSamples, type Person } from "@/lib/data";
import { useGiftCredit } from "@/lib/gifts";

type Tx = { id: string; who: string; text: string; when: string; daysAgo: number; amount: number; channel: "digital" | "cash" };

const transactions: Tx[] = [
  { id: "t1", who: "aleksandar", text: "You withdrew to bank", when: "Just now", daysAgo: 0, amount: -750, channel: "digital" },
  { id: "t2", who: "tibere", text: "Tibere Pey sent a refund for “I will teach you tennis”", when: "1 hour ago", daysAgo: 0, amount: 50, channel: "digital" },
  { id: "t3", who: "rajko", text: "Money received by Rajko Orman", when: "Oct 3", daysAgo: 26, amount: 75, channel: "digital" },
  { id: "t4", who: "aleksandar", text: "You credited your account", when: "Sep 17", daysAgo: 42, amount: 100, channel: "digital" },
  { id: "t5", who: "kim", text: "Cash payment from Kim Press", when: "Oct 21", daysAgo: 8, amount: 45, channel: "cash" },
  { id: "t6", who: "marija", text: "Cash payment from Marija Adams", when: "Oct 12", daysAgo: 17, amount: 20, channel: "cash" },
];

type BookingRow = { id: string; total: number; status: string; created_at: string; user?: Profile | null; session: { title: string; koach_id: string; ends_at: string } | null };

const daysAgo = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
const shortDate = (iso: string) => {
  const d = daysAgo(iso);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
};
// Koaches receive the session price; the 10% service fee and 20% VAT on top go to ZeeKoach and tax.
const koachShare = (total: number) => Math.round((Number(total) / 1.32) * 100) / 100;

// Real money movements for the signed-in person: what they paid for bookings and, for Koaches, what they earned.
function useRealWallet() {
  const { user } = useAuth();
  const [data, setData] = useState<{ txs: Tx[]; balance: number; pending: number } | null>(null);
  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    (async () => {
      const [{ data: mine }, { data: earned }] = await Promise.all([
        supabase!.from("bookings").select("id, total, status, created_at, session:sessions(title, koach_id, ends_at)").eq("user_id", user.id).eq("status", "confirmed"),
        supabase!
          .from("bookings")
          .select("id, total, status, created_at, user:profiles!bookings_user_id_fkey(*), session:sessions!inner(title, koach_id, ends_at)")
          .eq("session.koach_id", user.id)
          .eq("status", "confirmed"),
      ]);
      const txs: Tx[] = [];
      for (const b of (mine ?? []) as unknown as BookingRow[]) {
        if (!b.session) continue;
        txs.push({ id: `p-${b.id}`, who: b.session.koach_id, text: `You booked “${b.session.title}”`, when: shortDate(b.created_at), daysAgo: daysAgo(b.created_at), amount: -Number(b.total), channel: "digital" });
      }
      let balance = 0;
      let pending = 0;
      for (const b of (earned ?? []) as unknown as BookingRow[]) {
        if (!b.session || !b.user) continue;
        registerProfile(b.user);
        const amount = koachShare(b.total);
        if (new Date(b.session.ends_at) < new Date()) balance += amount;
        else pending += amount;
        txs.push({ id: `e-${b.id}`, who: b.user.id, text: `${b.user.name || "Someone"} booked “${b.session.title}”`, when: shortDate(b.created_at), daysAgo: daysAgo(b.created_at), amount, channel: "digital" });
      }
      txs.sort((a, b) => a.daysAgo - b.daysAgo);
      if (alive) setData({ txs, balance: Math.round(balance * 100) / 100, pending: Math.round(pending * 100) / 100 });
    })();
    return () => {
      alive = false;
    };
  }, [user]);
  return data;
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
  const [note, setNote] = useState(false);
  const real = useRealWallet();
  const { user: me } = useAuth();
  const giftCredit = useGiftCredit(me?.id);
  const balance = real?.balance ?? demoBalance;

  const visible = (real?.txs ?? (showSamples ? transactions : [])).filter((t) => {
    const abs = Math.abs(t.amount);
    if (t.channel !== channel) return false;
    if (query && !t.text.toLowerCase().includes(query.toLowerCase())) return false;
    if (frame === "This Month" && t.daysAgo > 28) return false;
    if (frame === "Last Month" && (t.daysAgo <= 28 || t.daysAgo > 59)) return false;
    if (t.amount > 0 && !dirIn) return false;
    if (t.amount < 0 && !dirOut) return false;
    return abs >= range[0] && abs <= range[1];
  });

  const left = (
    <>
      <OutlineButton href="/locations/new">Manage a location</OutlineButton>
      <Card className="px-[25px] py-[22px]">
        <div className="flex items-center justify-between text-[13px] font-bold text-primary">
          <span>Balance</span>
          <span>${balance.toLocaleString()}</span>
        </div>
        {giftCredit > 0 && (
          <p className="mt-1 flex justify-between text-xs font-semibold text-muted">
            <span>Gift credit (used on bookings)</span>
            <span>${giftCredit.toLocaleString()}</span>
          </p>
        )}
        {real && real.pending > 0 && (
          <p className="mt-1 flex justify-between text-xs font-semibold text-muted">
            <span>Pending (sessions not done yet)</span>
            <span>${real.pending.toLocaleString()}</span>
          </p>
        )}
        <ul className="mt-[18px] space-y-[14px] text-[13px] font-semibold text-muted">
          {[
            { label: "Payment Methods", Icon: CreditCard },
            { label: "Add Fund", Icon: WalletCards },
            { label: "Withdraw", Icon: Landmark },
          ].map(({ label, Icon }) => (
            <li key={label}>
              <button onClick={() => setNote(true)} className="flex items-center gap-3 hover:text-primary">
                <Icon className="size-4" aria-hidden /> {label}
              </button>
            </li>
          ))}
        </ul>
        {note && <p className="mt-4 rounded-[10px] bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">Payouts, top-ups and saved cards open once payments are switched on with Stripe.</p>}
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
      <PillTabs
        options={[
          { v: "digital", label: "Digital", Icon: CreditCard },
          { v: "cash", label: "Cash", Icon: Banknote },
        ]}
        onChange={setChannel}
      />
      <Card className="min-h-[290px] px-[15px] py-[15px]">
        {visible.length === 0 ? (
          <p className="py-16 text-center text-[13px] font-semibold text-muted">{real && !real.txs.length ? "No transactions yet. Bookings you make or receive show up here." : "No transactions match these filters."}</p>
        ) : (
          <ul className="space-y-[5px]">
            {visible.map((t) => (
              <li key={t.id} className="flex items-center gap-[15px] rounded-[14px] px-[10px] py-[10px] hover:bg-bg">
                {getPerson(t.who) && <Avatar person={getPerson(t.who) as Person} size={40} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{t.text}</p>
                  <p className="mt-1 text-xs font-semibold text-muted">{t.when}</p>
                </div>
                <span className={`text-[13px] font-bold ${t.amount < 0 ? "text-ink" : "text-primary"}`}>
                  {t.amount < 0 ? "- " : "+ "}${Math.abs(t.amount)}
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
      <HelpUsGrow />
      <RightRailFooter />
    </>
  );

  return (
    <>
      <ThreeColumns left={left} center={center} right={right} />
      <Fab />
    </>
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
        Promote ZeeKoach from your favourite social networks and <b className="text-ink">earn lifetime commissions.</b>
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
