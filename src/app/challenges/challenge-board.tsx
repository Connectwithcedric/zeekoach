"use client";

import { useState } from "react";
import { Award, CheckCheck, Compass, Eye, Flag, Forward, MessageSquare, MoreHorizontal, Search, SendHorizontal, ThumbsUp } from "lucide-react";
import { PillTabs } from "@/components/tabs-bar";
import { Avatar, Card, Fab, FollowSuggestions, Photo, RightRailFooter, ThreeColumns } from "@/components/ui";
import { currentUserId, getPerson, type Person, type PhotoKey } from "@/lib/data";

type Challenge = { id: string; a: string; b: string; rule: string; endsIn: string; imgA: PhotoKey; imgB: PhotoKey; votesA: number; votesB: number; views: number; comments: string[]; done?: boolean; following?: boolean };

const rules = [
  "Do 30 pushups as fast as possible",
  "Hold a plank for as long as possible",
  "Most burpees in 60 seconds",
  "Fastest 1 km run",
  "Most squats in 2 minutes",
  "Longest wall sit",
  "Most pull-ups in one set",
  "Most jump rope skips in 1 minute",
];

const initial: Challenge[] = [
  { id: "c1", a: "tibere", b: "kim", rule: "Do the most pushups possible in 20 sec", endsIn: "23h", imgA: "band", imgB: "ropes", votesA: 13, votesB: 7, views: 24, comments: ["Tibere has this one 💪"], following: true },
  { id: "c2", a: "alphonso", b: "rajko", rule: "Most burpees in 60 seconds", endsIn: "5h", imgA: "football", imgB: "hiit", votesA: 9, votesB: 11, views: 88, comments: [] },
  { id: "c3", a: "lena", b: "paityn", rule: "Fastest 1 km run", endsIn: "Ended", imgA: "run", imgB: "yoga", votesA: 31, votesB: 12, views: 310, comments: ["What a finish!"], done: true },
];

export function ChallengeBoard() {
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<"explore" | "following" | "results">("explore");
  const [ruleQuery, setRuleQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  const shown = list.filter((c) => (tab === "results" ? c.done : tab === "following" ? c.following && !c.done : !c.done));
  const update = (id: string, fn: (c: Challenge) => Challenge) => setList((l) => l.map((c) => (c.id === id ? fn(c) : c)));

  const left = (
    <Card className="pb-[10px]">
      <h2 className="px-[25px] pt-[21px] text-[15px] font-bold">Challenge Someone</h2>
      <label className="mx-[20px] mt-[16px] flex h-10 items-center gap-2 rounded-[12px] bg-bg px-4 text-[13px] text-muted">
        <Search className="size-4" aria-hidden />
        <input value={ruleQuery} onChange={(e) => setRuleQuery(e.target.value)} placeholder="Search rules" className="w-full bg-transparent font-semibold text-ink outline-none placeholder:text-muted" />
      </label>
      <ul className="mt-[10px] px-[10px]">
        {rules
          .filter((r) => r.toLowerCase().includes(ruleQuery.toLowerCase()))
          .map((r) => (
            <li key={r}>
              <button onClick={() => setSent(r)} className="flex w-full items-center justify-between rounded-[10px] px-[15px] py-[7px] text-left text-xs font-semibold text-muted hover:bg-bg hover:text-ink">
                {r}
                <SendHorizontal className="size-4 shrink-0 fill-primary-soft text-primary" aria-label="Send challenge" />
              </button>
            </li>
          ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) setSent(custom.trim());
          setCustom("");
        }}
        className="mt-[10px] flex items-center gap-3 border-t border-line px-[20px] pt-[15px]"
      >
        <Avatar person={getPerson(currentUserId) as Person} size={34} />
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom rules" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-muted" />
        <button aria-label="Send custom challenge" className="text-muted hover:text-primary">
          <SendHorizontal className="size-4" />
        </button>
      </form>
      {sent && <p className="mx-[20px] mt-3 rounded-[10px] bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">Challenge ready: “{sent}”. Pick who to challenge from their profile.</p>}
    </Card>
  );

  const center = (
    <>
      <PillTabs
        className="px-[40px]"
        options={[
          { v: "explore", label: "Explore", Icon: Compass },
          { v: "following", label: "Following", Icon: CheckCheck },
          { v: "results", label: "Results", Icon: Flag },
        ]}
        onChange={setTab}
      />
      {shown.length === 0 && <Card className="py-16 text-center text-[13px] font-semibold text-muted">No challenges here yet.</Card>}
      {shown.map((c) => (
        <ChallengeCard key={c.id} c={c} onVote={(side) => update(c.id, (x) => ({ ...x, votesA: x.votesA + (side === "a" ? 1 : 0), votesB: x.votesB + (side === "b" ? 1 : 0) }))} onComment={(t) => update(c.id, (x) => ({ ...x, comments: [...x.comments, t] }))} />
      ))}
    </>
  );

  return (
    <>
      <ThreeColumns left={left} center={center} right={<><FollowSuggestions /><RightRailFooter /></>} />
      <Fab />
    </>
  );
}

function ChallengeCard({ c, onVote, onComment }: { c: Challenge; onVote: (side: "a" | "b") => void; onComment: (t: string) => void }) {
  const [voted, setVoted] = useState<"a" | "b" | null>(null);
  const [liked, setLiked] = useState(false);
  const [draft, setDraft] = useState("");
  const a = getPerson(c.a) as Person;
  const b = getPerson(c.b) as Person;
  const total = c.votesA + c.votesB || 1;
  const pa = Math.round((c.votesA / total) * 100);
  const canVote = !voted && !c.done;
  const winner = pa >= 50 ? "a" : "b";
  const label = (side: "a" | "b") => (c.done ? (side === winner ? "WINNER" : "") : voted === side ? "VOTED" : "VOTE");
  const vote = (side: "a" | "b") => {
    if (!canVote) return;
    setVoted(side);
    onVote(side);
  };
  return (
    <Card>
      <div className="flex items-center gap-[15px] px-[20px] pt-[20px]">
        <span className="relative size-[46px] shrink-0">
          <span className="absolute left-0 top-0"><Avatar person={a} size={32} /></span>
          <span className="absolute bottom-0 right-0"><Avatar person={b} size={32} /></span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-bold">{a.name} VS {b.name}</h3>
          <p className="mt-0.5 text-xs font-semibold text-muted">{c.rule} - {c.endsIn}</p>
        </div>
        <button aria-label="Share" className="text-muted hover:text-primary"><Forward className="size-5" /></button>
        <button aria-label="More" className="text-muted hover:text-primary"><MoreHorizontal className="size-5" /></button>
      </div>
      <div className="relative mx-[20px] mt-[20px] grid h-[380px] grid-cols-2 overflow-hidden rounded-[16px] border-2 border-primary max-sm:h-[260px]">
        {(["a", "b"] as const).map((side) => (
          <button key={side} onClick={() => vote(side)} disabled={!canVote} className={`group relative ${side === "a" ? "border-r-2 border-white" : ""}`}>
            <Photo k={side === "a" ? c.imgA : c.imgB} w={320} h={380} className="size-full" />
            {label(side) && (
              <span className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-[8px] px-5 py-1.5 text-[11px] font-bold text-white ${voted === side || c.done ? "bg-primary" : "bg-black/40 group-enabled:group-hover:bg-primary"}`}>
                {label(side)}
              </span>
            )}
          </button>
        ))}
        <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow">
          <Award className="size-5" aria-hidden />
        </span>
        {(voted || c.done) && (
          <>
            <span className="absolute left-2 top-[35%] flex size-[42px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{pa}%</span>
            <span className="absolute right-2 top-[50%] flex size-[42px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{100 - pa}%</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-[35px] py-[16px] text-[13px] font-bold">
        <button onClick={() => setLiked(!liked)} className={`flex items-center gap-2 ${liked ? "text-primary" : "text-ink"}`}>
          <ThumbsUp className={`size-5 ${liked ? "fill-primary-soft" : ""}`} /> {liked ? 1 : 0}
        </button>
        <span className="flex items-center gap-2"><Eye className="size-5 text-muted" /> {c.views}</span>
        <span className="flex items-center gap-2"><MessageSquare className="size-5 text-muted" /> {c.comments.length}</span>
      </div>
      {c.comments.length > 0 && (
        <ul className="space-y-1 border-t border-line px-[25px] py-3 text-xs font-semibold text-muted">
          {c.comments.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) onComment(draft.trim());
          setDraft("");
        }}
        className="flex items-center gap-3 border-t border-line px-[20px] py-[14px]"
      >
        <Avatar person={getPerson(currentUserId) as Person} size={34} />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a comment" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-muted" />
      </form>
    </Card>
  );
}
