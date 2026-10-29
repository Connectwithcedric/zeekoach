"use client";

import { useState } from "react";
import { Check, CheckCheck, Copy, Eye, FileSignature, Forward, Hourglass, Megaphone, MoreHorizontal, Plus, Repeat2, SlidersHorizontal, UserSearch, Wallet } from "lucide-react";
import { Toggle } from "@/components/controls";
import { PillTabs } from "@/components/tabs-bar";
import { Avatar, Card, Fab, Photo, RightRailFooter, ThreeColumns } from "@/components/ui";
import { getPerson, type Person, type PhotoKey } from "@/lib/data";

const frames = ["Always", "This Month", "Last Month", "Custom"] as const;
const statsByFrame: Record<(typeof frames)[number], { shares: number; views: number; signups: number; conversions: number; holdback: number; earnings: number }> = {
  Always: { shares: 39, views: 72, signups: 8, conversions: 12, holdback: 4, earnings: 32 },
  "This Month": { shares: 11, views: 25, signups: 3, conversions: 4, holdback: 2, earnings: 9 },
  "Last Month": { shares: 14, views: 30, signups: 2, conversions: 5, holdback: 1, earnings: 12 },
  Custom: { shares: 39, views: 72, signups: 8, conversions: 12, holdback: 4, earnings: 32 },
};

const referrals = [
  { id: "tibere", type: "Direct", added: true },
  { id: "marija", type: "Indirect", added: true },
  { id: "alphonso", type: "Indirect", added: true },
  { id: "lena", type: "Direct", added: false },
  { id: "kim", type: "Direct", added: true },
];

const ads: { id: string; tab: "ads" | "shared" | "recruitment"; title: string; sub: string; image: PhotoKey; cta: string }[] = [
  { id: "a1", tab: "ads", title: "ZeeKoach", sub: "The only Sports Social Marketplace", image: "bike2", cta: "Share & Earn" },
  { id: "a2", tab: "ads", title: "ZeeKoach", sub: "Find a Koach near you", image: "tennis", cta: "Share & Earn" },
  { id: "a3", tab: "shared", title: "ZeeKoach", sub: "You shared this on Instagram · 3 days ago", image: "gym", cta: "Share again" },
  { id: "a4", tab: "recruitment", title: "Become a Koach", sub: "Earn 20% on every Koach you bring", image: "coach", cta: "Invite a Koach" },
];

export function ShareBoard() {
  const [frame, setFrame] = useState<(typeof frames)[number]>("Always");
  const [direct, setDirect] = useState(true);
  const [indirect, setIndirect] = useState(true);
  const [tab, setTab] = useState<"ads" | "shared" | "recruitment">("ads");
  const [copied, setCopied] = useState(false);
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const st = statsByFrame[frame];
  const link = "www.zeekoach.com/aleksandar";

  const statRows = [
    { label: "Shares", value: st.shares + sharedIds.length, Icon: Forward },
    { label: "Views", value: st.views, Icon: Eye },
    { label: "Signups", value: st.signups, Icon: FileSignature },
    { label: "Conversions", value: st.conversions, Icon: Repeat2 },
  ];

  const left = (
    <Card className="px-[25px] pb-[20px] pt-[21px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold">My Stats</h2>
        <span className="flex size-8 items-center justify-center rounded-[8px] bg-primary text-white"><SlidersHorizontal className="size-4" aria-hidden /></span>
      </div>
      <ul className="mt-[16px] space-y-[14px] text-[13px] font-semibold text-muted">
        {statRows.map(({ label, value, Icon }) => (
          <li key={label} className="flex items-center gap-3"><Icon className="size-4" aria-hidden /><span className="flex-1">{label}</span><b className="text-ink">{value}</b></li>
        ))}
      </ul>
      <ul className="mt-[18px] space-y-[14px] border-t border-line pt-[18px] text-[13px] font-semibold text-muted">
        <li className="flex items-center gap-3"><Hourglass className="size-4" aria-hidden /><span className="flex-1">Holdback</span><b className="text-ink">${st.holdback}</b></li>
        <li className="flex items-center gap-3"><Wallet className="size-4" aria-hidden /><span className="flex-1">Earnings</span><b className="text-ink">${st.earnings}</b></li>
      </ul>
      <p className="mt-[22px] text-[13px] font-bold">Time frame filters</p>
      {frames.map((f) => <Toggle key={f} label={f} checked={frame === f} onChange={() => setFrame(f)} />)}
      <p className="mt-[18px] text-[13px] font-bold">Referral type</p>
      <Toggle label="Direct referral" checked={direct} onChange={setDirect} />
      <Toggle label="Indirect referral" checked={indirect} onChange={setIndirect} />
    </Card>
  );

  const center = (
    <>
      <Card className="px-[25px] py-[22px]">
        <h1 className="text-[17px] font-bold">Help us grow and earn lifetime commissions!</h1>
        <div className="mt-3 space-y-2.5 text-[13px] font-semibold leading-relaxed text-muted">
          <p>Promote ZeeKoach from your favourite social networks and <b className="text-ink">earn lifetime commissions.</b></p>
          <p>Earn 20% lifetime commission on every ProKoach and certified location you refer.</p>
          <p>Earn 10% lifetime commission on every passive ProKoach and certified location you refer.</p>
          <p>Earn referral fees on every transaction your direct or indirect Koaches make.</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="truncate text-xs font-bold text-primary">{link}</span>
          <button aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(`https://${link}`); setCopied(true); }} className="flex size-8 items-center justify-center rounded-[8px] bg-bg text-primary hover:bg-primary-soft">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
          <button aria-label="Share link" className="flex size-8 items-center justify-center rounded-[8px] bg-bg text-primary hover:bg-primary-soft"><Forward className="size-4" /></button>
        </div>
      </Card>
      <PillTabs
        className="px-[40px]"
        options={[
          { v: "ads", label: "Ads", Icon: Megaphone },
          { v: "shared", label: "Shared", Icon: Forward },
          { v: "recruitment", label: "Recruitment", Icon: UserSearch },
        ]}
        onChange={setTab}
      />
      {ads.filter((a) => a.tab === tab).map((a) => (
        <Card key={a.id} className="p-[20px]">
          <div className="flex items-center gap-3">
            <span className="flex size-[42px] items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white">Z</span>
            <div className="flex-1">
              <p className="text-[15px] font-bold">{a.title}</p>
              <p className="text-xs font-semibold text-muted">{a.sub}</p>
            </div>
            <MoreHorizontal className="size-5 text-muted" aria-hidden />
          </div>
          <div className="mt-[18px] overflow-hidden rounded-[16px]">
            <Photo k={a.image} w={600} h={460} className="h-[460px] w-full max-sm:h-[280px]" />
            <button
              onClick={() => setSharedIds((s) => (s.includes(a.id) ? s : [...s, a.id]))}
              className="flex h-[58px] w-full items-center justify-between bg-primary px-[25px] text-[15px] font-bold text-white hover:bg-primary-strong"
            >
              {sharedIds.includes(a.id) ? "Shared, thanks!" : a.cta}
              <Forward className="size-5" aria-hidden />
            </button>
          </div>
        </Card>
      ))}
    </>
  );

  const right = (
    <>
      <Card className="pb-[15px]">
        <div className="flex items-center justify-between px-[25px] pt-[21px]">
          <h2 className="text-[15px] font-bold">Your Referrals</h2>
          <span className="text-xs font-bold text-primary">All</span>
        </div>
        <ul className="mt-[13px] space-y-[5px] px-[15px]">
          {referrals
            .filter((r) => (r.type === "Direct" ? direct : indirect))
            .map((r) => {
              const p = getPerson(r.id) as Person;
              return (
                <li key={r.id} className="flex items-center gap-[15px] rounded-[14px] px-[10px] py-[8px] hover:bg-bg">
                  <Avatar person={p} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{p.name}</p>
                    <p className="text-xs font-semibold text-muted">{r.type}</p>
                  </div>
                  <span className="flex size-8 items-center justify-center rounded-[8px] bg-bg text-primary">
                    {r.added ? <CheckCheck className="size-4" aria-label="Joined" /> : <Plus className="size-4" aria-label="Invited" />}
                  </span>
                </li>
              );
            })}
        </ul>
      </Card>
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
