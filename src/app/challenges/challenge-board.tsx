"use client";

import Link from "next/link";
import { FollowSuggestions } from "@/components/suggestions";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Award, CheckCheck, Compass, Eye, Flag, MessageSquare, Search, SendHorizontal, ThumbsUp, Upload, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PillTabs } from "@/components/tabs-bar";
import { Avatar, Card, Photo, RightRailFooter, ThreeColumns } from "@/components/ui";
import { currentUserId, getPerson, people, showSamples, type Person, type PhotoKey } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

type Media = { k?: PhotoKey; url?: string };
type Challenge = {
  id: string;
  a: string;
  b: string;
  rule: string;
  endsAt?: string | null;
  endsIn?: string;
  mediaA: Media;
  mediaB: Media;
  votesA: number;
  votesB: number;
  views: number;
  comments: string[];
  likes: number;
  liked?: boolean;
  myVote?: "a" | "b" | null;
  done?: boolean;
  following?: boolean;
  real?: boolean;
  status?: "pending" | "live" | "declined";
};

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

const demo: Challenge[] = [
  { id: "c1", a: "tibere", b: "kim", rule: "Do the most pushups possible in 20 sec", endsIn: "23h", mediaA: { k: "band" }, mediaB: { k: "ropes" }, votesA: 13, votesB: 7, views: 24, comments: ["Tibere has this one 💪"], likes: 4, following: true },
  { id: "c2", a: "alphonso", b: "rajko", rule: "Most burpees in 60 seconds", endsIn: "5h", mediaA: { k: "football" }, mediaB: { k: "hiit" }, votesA: 9, votesB: 11, views: 88, comments: [], likes: 2 },
  { id: "c3", a: "lena", b: "paityn", rule: "Fastest 1 km run", endsIn: "Ended", mediaA: { k: "run" }, mediaB: { k: "yoga" }, votesA: 31, votesB: 12, views: 310, comments: ["What a finish!"], likes: 9, done: true },
];

const isVideo = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
const uploadPath = (uid: string, f: File) => `${uid}/challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${f.name.split(".").pop() || "jpg"}`;
const left = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h left` : `${Math.max(1, Math.floor(ms / 60_000))}m left`;
};

async function upload(uid: string, file: File) {
  const path = uploadPath(uid, file);
  const { error } = await supabase!.storage.from("posts").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase!.storage.from("posts").getPublicUrl(path).data.publicUrl;
}

type Row = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  rule: string;
  media_a: string;
  media_b: string | null;
  status: "pending" | "live" | "declined";
  ends_at: string | null;
  views: number;
  challenger: Profile;
  opponent: Profile;
  challenge_votes: { side: "a" | "b"; user_id: string }[];
  challenge_likes: { user_id: string }[];
  challenge_comments: { body: string; created_at: string; user: { name: string } | null }[];
};

function toChallenge(r: Row, me: string | undefined, followed: Set<string>): Challenge {
  registerProfile(r.challenger);
  registerProfile(r.opponent);
  const done = r.status === "live" && !!r.ends_at && new Date(r.ends_at) <= new Date();
  return {
    id: r.id,
    a: r.challenger_id,
    b: r.opponent_id,
    rule: r.rule,
    endsAt: r.ends_at,
    endsIn: r.ends_at ? left(r.ends_at) : "Waiting",
    mediaA: { url: r.media_a },
    mediaB: { url: r.media_b ?? undefined },
    votesA: r.challenge_votes.filter((v) => v.side === "a").length,
    votesB: r.challenge_votes.filter((v) => v.side === "b").length,
    myVote: r.challenge_votes.find((v) => v.user_id === me)?.side ?? null,
    likes: r.challenge_likes.length,
    liked: r.challenge_likes.some((l) => l.user_id === me),
    comments: [...r.challenge_comments].sort((x, y) => x.created_at.localeCompare(y.created_at)).map((c) => `${c.user?.name ?? "Someone"}: ${c.body}`),
    views: r.views,
    done,
    following: followed.has(r.challenger_id) || followed.has(r.opponent_id),
    real: true,
    status: r.status,
  };
}

const select =
  "*, challenger:profiles!challenges_challenger_id_fkey(*), opponent:profiles!challenges_opponent_id_fkey(*), challenge_votes(side, user_id), challenge_likes(user_id), challenge_comments(body, created_at, user:profiles!challenge_comments_user_id_fkey(name))";

export function ChallengeBoard() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const me = user?.id;
  const [real, setReal] = useState<Challenge[]>([]);
  const [tab, setTab] = useState<"explore" | "following" | "results">("explore");
  const [ruleQuery, setRuleQuery] = useState("");
  const [custom, setCustom] = useState("");
  const [rule, setRule] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!supabase) return [];
    const [{ data }, follows] = await Promise.all([
      supabase.from("challenges").select(select).neq("status", "declined").order("created_at", { ascending: false }).limit(100),
      me ? supabase.from("follows").select("followee_id").eq("follower_id", me) : Promise.resolve({ data: [] as { followee_id: string }[] }),
    ]);
    const followed = new Set((follows.data ?? []).map((f) => f.followee_id as string));
    return ((data ?? []) as Row[]).map((r) => toChallenge(r, me, followed));
  }, [me]);
  const load = useCallback(() => fetchAll().then(setReal), [fetchAll]);

  useEffect(() => {
    let alive = true;
    fetchAll().then((list) => alive && setReal(list));
    return () => {
      alive = false;
    };
  }, [fetchAll]);

  const live = real.filter((c) => c.status === "live");
  const all = [...live, ...(showSamples ? demo : [])];
  const shown = all.filter((c) => (tab === "results" ? c.done : tab === "following" ? c.following && !c.done : !c.done));
  const forMe = real.filter((c) => c.status === "pending" && c.b === me);
  const sent = real.filter((c) => c.status === "pending" && c.a === me);
  const update = (id: string, fn: (c: Challenge) => Challenge) => setReal((l) => l.map((c) => (c.id === id ? fn(c) : c)));

  const meDemo = (profile && getPerson(profile.id)) || (getPerson(currentUserId) as Person);

  const leftCol = (
    <>
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
                <button onClick={() => (me ? setRule(r) : router.push("/login"))} className="flex w-full items-center justify-between rounded-[10px] px-[15px] py-[7px] text-left text-xs font-semibold text-muted hover:bg-bg hover:text-ink">
                  {r}
                  <SendHorizontal className="size-4 shrink-0 fill-primary-soft text-primary" aria-label="Send challenge" />
                </button>
              </li>
            ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!custom.trim()) return;
            if (!me) return router.push("/login");
            setRule(custom.trim());
            setCustom("");
          }}
          className="mt-[10px] flex items-center gap-3 border-t border-line px-[20px] pt-[15px]"
        >
          <Avatar person={meDemo} size={34} />
          <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={140} placeholder="Custom rules" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-muted" />
          <button aria-label="Send custom challenge" className="text-muted hover:text-primary">
            <SendHorizontal className="size-4" />
          </button>
        </form>
      </Card>
      {rule && me && <NewChallenge me={me} rule={rule} onClose={() => setRule(null)} onSent={load} />}
      {sent.length > 0 && (
        <Card className="px-[20px] py-[18px]">
          <h2 className="text-[15px] font-bold">Waiting for an answer</h2>
          <ul className="mt-3 space-y-3">
            {sent.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <Avatar person={getPerson(c.b)!} size={34} />
                <span className="min-w-0 flex-1 text-xs font-semibold text-muted">
                  <span className="block truncate font-bold text-ink">{getPerson(c.b)!.name}</span>
                  <span className="block truncate">{c.rule}</span>
                </span>
                <button
                  onClick={async () => {
                    await supabase!.from("challenges").delete().eq("id", c.id);
                    load();
                  }}
                  className="text-xs font-bold text-muted hover:text-live"
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );

  const center = (
    <>
      {forMe.map((c) => (
        <IncomingChallenge key={c.id} c={c} me={me!} onDone={load} />
      ))}
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
        <ChallengeCard
          key={c.id}
          c={c}
          me={me}
          meDemo={meDemo}
          onVote={async (side) => {
            if (!c.real) return true;
            if (!me) return router.push("/login"), false;
            const { error } = await supabase!.from("challenge_votes").insert({ challenge_id: c.id, user_id: me, side });
            if (error) return false;
            update(c.id, (x) => ({ ...x, myVote: side, votesA: x.votesA + (side === "a" ? 1 : 0), votesB: x.votesB + (side === "b" ? 1 : 0) }));
            return true;
          }}
          onLike={async (liked) => {
            if (!c.real || !me) return;
            if (liked) await supabase!.from("challenge_likes").insert({ challenge_id: c.id, user_id: me });
            else await supabase!.from("challenge_likes").delete().eq("challenge_id", c.id).eq("user_id", me);
          }}
          onComment={async (t) => {
            if (!c.real) return true;
            if (!me) return router.push("/login"), false;
            const { error } = await supabase!.from("challenge_comments").insert({ challenge_id: c.id, user_id: me, body: t });
            return !error;
          }}
        />
      ))}
    </>
  );

  return <ThreeColumns left={leftCol} center={center} right={<><FollowSuggestions /><RightRailFooter /></>} />;
}

function MediaPicker({ file, onPick }: { file: File | null; onPick: (f: File | null) => void }) {
  return (
    <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[12px] border-2 border-dashed border-line text-[13px] font-bold text-primary hover:bg-bg">
      <Upload className="size-4" /> {file ? file.name.slice(0, 28) : "Add your attempt (photo or video)"}
      <input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}

// Pick who to challenge and add your own attempt.
function NewChallenge({ me, rule, onClose, onSent }: { me: string; rule: string; onClose: () => void; onSent: () => void }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [opponent, setOpponent] = useState<Person | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const q = query.trim().replace(/[%,()]/g, "");
    const t = setTimeout(async () => {
      let req = supabase!.from("profiles").select("*").neq("id", me).limit(8);
      if (q) req = req.or(`name.ilike.%${q}%,username.ilike.%${q}%`);
      const { data } = await req;
      (data as Profile[] | null)?.forEach(registerProfile);
      if (alive) setFound(((data as Profile[] | null) ?? []).map((p) => getPerson(p.id)!).filter(Boolean));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, me]);

  async function send() {
    if (!opponent || !file) return setMsg("Pick someone and add your attempt.");
    if (file.size > 50 * 1024 * 1024) return setMsg("Files can be up to 50 MB.");
    setBusy(true);
    setMsg(null);
    try {
      const media_a = await upload(me, file);
      const { error } = await supabase!.from("challenges").insert({ challenger_id: me, opponent_id: opponent.id, rule, media_a });
      if (error) throw error;
      onSent();
      onClose();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Card className="space-y-3 px-[20px] py-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold">New challenge</h2>
          <p className="mt-1 text-xs font-semibold text-muted">{rule}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><X className="size-4" /></button>
      </div>
      {opponent ? (
        <div className="flex items-center gap-3 rounded-[12px] bg-bg px-3 py-2">
          <Avatar person={opponent} size={30} />
          <span className="flex-1 text-[13px] font-bold">{opponent.name}</span>
          <button onClick={() => setOpponent(null)} className="text-xs font-bold text-primary">Change</button>
        </div>
      ) : (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Who do you challenge?" className="h-10 w-full rounded-[12px] bg-bg px-3 text-[13px] font-semibold outline-none placeholder:text-muted" />
          <ul className="max-h-[200px] overflow-y-auto">
            {found.map((p) => (
              <li key={p.id}>
                <button onClick={() => setOpponent(p)} className="flex w-full items-center gap-3 rounded-[10px] px-2 py-1.5 text-left hover:bg-bg">
                  <Avatar person={p} size={30} />
                  <span className="truncate text-[13px] font-bold">{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <MediaPicker file={file} onPick={setFile} />
      {msg && <p className="text-xs font-semibold text-live">{msg}</p>}
      <button onClick={send} disabled={busy} className="h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:opacity-60">
        {busy ? "Sending…" : "Send challenge"}
      </button>
    </Card>
  );
}

// A challenge someone sent you: accept with your attempt, or decline.
function IncomingChallenge({ c, me, onDone }: { c: Challenge; me: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const from = getPerson(c.a)!;

  async function respond(accept: boolean) {
    if (accept && !file) return setMsg("Add your attempt to accept.");
    setBusy(true);
    setMsg(null);
    try {
      const media = accept && file ? await upload(me, file) : null;
      const { error } = await supabase!.rpc("respond_challenge", { cid: c.id, accept, media });
      if (error) throw error;
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Card className="space-y-3 border-2 border-primary px-[20px] py-[18px]">
      <div className="flex items-center gap-3">
        <Avatar person={from} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">{from.name} challenged you!</p>
          <p className="text-xs font-semibold text-muted">{c.rule}</p>
        </div>
      </div>
      <MediaBox m={c.mediaA} className="h-[220px] w-full rounded-[12px]" />
      <MediaPicker file={file} onPick={setFile} />
      {msg && <p className="text-xs font-semibold text-live">{msg}</p>}
      <div className="flex gap-3">
        <button onClick={() => respond(true)} disabled={busy} className="h-10 flex-1 rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:opacity-60">
          {busy ? "Please wait…" : "Accept"}
        </button>
        <button onClick={() => respond(false)} disabled={busy} className="h-10 flex-1 rounded-[10px] bg-bg text-[13px] font-bold text-muted">
          Decline
        </button>
      </div>
    </Card>
  );
}

function MediaBox({ m, className = "" }: { m: Media; className?: string }) {
  if (m.url && isVideo(m.url)) return <video src={m.url} controls playsInline className={`bg-black object-cover ${className}`} />;
  if (m.url) return <img src={m.url} alt="" className={`bg-black object-cover ${className}`} />;
  return <Photo k={m.k ?? "gym"} w={320} h={380} className={className} />;
}

function ChallengeCard({
  c,
  me,
  meDemo,
  onVote,
  onLike,
  onComment,
}: {
  c: Challenge;
  me: string | undefined;
  meDemo: Person;
  onVote: (side: "a" | "b") => Promise<boolean | void>;
  onLike: (liked: boolean) => void;
  onComment: (t: string) => Promise<boolean | void>;
}) {
  const [localVote, setLocalVote] = useState<"a" | "b" | null>(null);
  const [liked, setLiked] = useState(!!c.liked);
  const [likes, setLikes] = useState(c.likes);
  const [comments, setComments] = useState(c.comments);
  const [draft, setDraft] = useState("");
  const voted = c.myVote ?? localVote;
  const a = getPerson(c.a) ?? people[0];
  const b = getPerson(c.b) ?? people[1];
  const votesA = c.votesA + (!c.real && localVote === "a" ? 1 : 0);
  const votesB = c.votesB + (!c.real && localVote === "b" ? 1 : 0);
  const total = votesA + votesB || 1;
  const pa = Math.round((votesA / total) * 100);
  const isPlayer = !!me && (me === c.a || me === c.b);
  const canVote = !voted && !c.done && !isPlayer;
  const winner = votesA >= votesB ? "a" : "b";
  const label = (side: "a" | "b") => (c.done ? (side === winner ? "WINNER" : "") : voted === side ? "VOTED" : isPlayer ? "" : "VOTE");

  useEffect(() => {
    if (c.real) supabase?.rpc("add_challenge_view", { cid: c.id });
  }, [c.real, c.id]);

  const vote = async (side: "a" | "b") => {
    if (!canVote) return;
    const ok = await onVote(side);
    if (ok !== false && !c.real) setLocalVote(side);
  };

  return (
    <Card>
      <div className="flex items-center gap-[15px] px-[20px] pt-[20px]">
        <span className="relative size-[46px] shrink-0">
          <Link href={`/profile/${a.id}`} className="absolute left-0 top-0"><Avatar person={a} size={32} /></Link>
          <Link href={`/profile/${b.id}`} className="absolute bottom-0 right-0"><Avatar person={b} size={32} /></Link>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-bold">{a.name} VS {b.name}</h3>
          <p className="mt-0.5 text-xs font-semibold text-muted">{c.rule} - {c.done ? "Ended" : c.endsIn}</p>
        </div>
      </div>
      <div className="relative mx-[20px] mt-[20px] grid h-[380px] grid-cols-2 overflow-hidden rounded-[16px] border-2 border-primary max-sm:h-[260px]">
        {(["a", "b"] as const).map((side) => (
          <div key={side} className={`group relative ${side === "a" ? "border-r-2 border-white" : ""}`}>
            <MediaBox m={side === "a" ? c.mediaA : c.mediaB} className="size-full" />
            {label(side) && (
              <button
                onClick={() => vote(side)}
                disabled={!canVote}
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 rounded-[8px] px-5 py-1.5 text-[11px] font-bold text-white ${voted === side || c.done ? "bg-primary" : "bg-black/40 hover:bg-primary"}`}
              >
                {label(side)}
              </button>
            )}
          </div>
        ))}
        <span className="pointer-events-none absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary shadow">
          <Award className="size-5" aria-hidden />
        </span>
        {(voted || c.done || isPlayer) && (
          <>
            <span className="pointer-events-none absolute left-2 top-[35%] flex size-[42px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{pa}%</span>
            <span className="pointer-events-none absolute right-2 top-[50%] flex size-[42px] items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{100 - pa}%</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between px-[35px] py-[16px] text-[13px] font-bold">
        <button
          onClick={() => {
            if (c.real && !me) return;
            const next = !liked;
            setLiked(next);
            setLikes((n) => n + (next ? 1 : -1));
            onLike(next);
          }}
          className={`flex items-center gap-2 ${liked ? "text-primary" : "text-ink"}`}
        >
          <ThumbsUp className={`size-5 ${liked ? "fill-primary-soft" : ""}`} /> {likes}
        </button>
        <span className="flex items-center gap-2"><Eye className="size-5 text-muted" /> {c.views}</span>
        <span className="flex items-center gap-2"><MessageSquare className="size-5 text-muted" /> {comments.length}</span>
      </div>
      {comments.length > 0 && (
        <ul className="space-y-1 border-t border-line px-[25px] py-3 text-xs font-semibold text-muted">
          {comments.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const t = draft.trim();
          if (!t) return;
          const ok = await onComment(t);
          if (ok === false) return;
          setComments((cs) => [...cs, c.real ? `${meDemo.name}: ${t}` : t]);
          setDraft("");
        }}
        className="flex items-center gap-3 border-t border-line px-[20px] py-[14px]"
      >
        <Avatar person={meDemo} size={34} />
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder="Write a comment" className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-muted" />
      </form>
    </Card>
  );
}
