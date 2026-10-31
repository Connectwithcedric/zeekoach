"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCheck, Check, Image as ImageIcon, Plus, Search, SendHorizontal, Smile, ThumbsUp, X } from "lucide-react";
import { Avatar } from "@/components/ui";
import { getPerson, type Person } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

type Msg = { id: string; conversation_id: string; sender_id: string; body: string; image_url: string | null; read_at: string | null; created_at: string };
type Conv = { id: string; other: Person; last?: Msg };

const time = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { weekday: "short" });
};
const uploadPath = (uid: string, f: File) => `${uid}/chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${f.name.split(".").pop() || "jpg"}`;

async function loadConversations(me: string): Promise<Conv[]> {
  const db = supabase!;
  const { data: convs } = await db.from("conversations").select("id, user_a, user_b, last_at").order("last_at", { ascending: false }).limit(100);
  if (!convs?.length) return [];
  const others = convs.map((c) => (c.user_a === me ? c.user_b : c.user_a) as string);
  const [{ data: profiles }, { data: msgs }] = await Promise.all([
    db.from("profiles").select("*").in("id", others),
    db.from("messages").select("*").in("conversation_id", convs.map((c) => c.id)).order("created_at", { ascending: false }).limit(500),
  ]);
  (profiles as Profile[] | null)?.forEach(registerProfile);
  return convs.flatMap((c, i) => {
    const other = getPerson(others[i]);
    return other ? [{ id: c.id as string, other, last: (msgs as Msg[] | null)?.find((m) => m.conversation_id === c.id) }] : [];
  });
}

// Real one-to-one chat. Messages arrive live through Supabase Realtime.
export function RealChat({ me, startWith }: { me: Person; startWith: string | null }) {
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [finding, setFinding] = useState(false);
  const [found, setFound] = useState<Person[]>([]);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  const refresh = useCallback(() => loadConversations(me.id).then(setConvs), [me.id]);

  const open = useCallback(
    async (id: string) => {
      setActiveId(id);
      const { data } = await supabase!.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(500);
      setMsgs((data as Msg[]) ?? []);
      await supabase!.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", id).neq("sender_id", me.id).is("read_at", null);
      setConvs((cs) => cs?.map((c) => (c.id === id && c.last && c.last.sender_id !== me.id ? { ...c, last: { ...c.last, read_at: new Date().toISOString() } } : c)) ?? cs);
    },
    [me.id],
  );

  const startWithPerson = useCallback(
    async (otherId: string) => {
      const { data: cid, error } = await supabase!.rpc("start_conversation", { other: otherId });
      if (error || !cid) return;
      await refresh();
      await open(cid as string);
      setFinding(false);
    },
    [open, refresh],
  );

  useEffect(() => {
    let alive = true;
    loadConversations(me.id).then((cs) => {
      if (!alive) return;
      setConvs(cs);
      if (startWith && startWith !== me.id) startWithPerson(startWith);
      else if (cs[0] && window.innerWidth >= 768) open(cs[0].id);
    });
    return () => {
      alive = false;
    };
  }, [me.id, startWith, open, startWithPerson]);

  // New messages, in any of your conversations, arrive here live.
  useEffect(() => {
    const channel = supabase!
      .channel(`messages-${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if (m.conversation_id === activeRef.current) {
          setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
          if (m.sender_id !== me.id) supabase!.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id).then(() => {});
        }
        setConvs((cs) => {
          if (!cs?.some((c) => c.id === m.conversation_id)) {
            refresh();
            return cs;
          }
          const read = m.conversation_id === activeRef.current ? { ...m, read_at: m.read_at ?? new Date().toISOString() } : m;
          const updated = cs.map((c) => (c.id === m.conversation_id ? { ...c, last: read } : c));
          return [...updated.filter((c) => c.id === m.conversation_id), ...updated.filter((c) => c.id !== m.conversation_id)];
        });
      })
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [me.id, refresh]);

  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [activeId, msgs.length]);

  useEffect(() => {
    if (!finding) return;
    let alive = true;
    const q = query.trim();
    const t = setTimeout(async () => {
      let req = supabase!.from("profiles").select("*").neq("id", me.id).limit(20);
      if (q) req = req.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,username.ilike.%${q.replace(/[%,()]/g, "")}%`);
      const { data } = await req;
      (data as Profile[] | null)?.forEach(registerProfile);
      if (alive) setFound(((data as Profile[] | null) ?? []).map((p) => getPerson(p.id)!).filter(Boolean));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [finding, query, me.id]);

  async function send(body: string, image_url: string | null = null) {
    if (!activeId || (!body.trim() && !image_url)) return;
    setSending(true);
    const { data, error } = await supabase!.from("messages").insert({ conversation_id: activeId, sender_id: me.id, body: body.trim(), image_url }).select("*").single();
    setSending(false);
    if (error || !data) return;
    setDraft("");
    const m = data as Msg;
    setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    setConvs((cs) => {
      const updated = cs?.map((c) => (c.id === m.conversation_id ? { ...c, last: m } : c)) ?? [];
      return [...updated.filter((c) => c.id === m.conversation_id), ...updated.filter((c) => c.id !== m.conversation_id)];
    });
  }

  async function sendPhoto(file: File | undefined) {
    if (!file || file.size > 10 * 1024 * 1024) return;
    setSending(true);
    const path = uploadPath(me.id, file);
    const { error } = await supabase!.storage.from("posts").upload(path, file, { contentType: file.type });
    setSending(false);
    if (!error) send("", supabase!.storage.from("posts").getPublicUrl(path).data.publicUrl);
  }

  const active = convs?.find((c) => c.id === activeId);
  const list = (convs ?? []).filter((c) => c.other.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mt-[30px] flex h-[calc(100vh-190px)] min-h-[560px] overflow-hidden rounded-card bg-surface">
      <aside className={`w-full shrink-0 flex-col border-r border-line md:flex md:w-[300px] ${activeId ? "hidden" : "flex"}`}>
        <div className="flex items-center gap-3 p-[15px]">
          <button onClick={() => setFinding((f) => !f)} aria-label={finding ? "Close" : "New chat"} className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft">
            {finding ? <X className="size-5" /> : <Plus className="size-5" />}
          </button>
          <label className="flex h-10 flex-1 items-center gap-2 rounded-[12px] bg-bg px-3 text-[13px] text-muted">
            <Search className="size-4" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={finding ? "Find people" : "Search chats"} className="w-full bg-transparent font-semibold text-ink outline-none placeholder:text-muted" />
          </label>
        </div>
        <ul className="flex-1 space-y-[2px] overflow-y-auto px-[10px] pb-3">
          {finding ? (
            found.length ? (
              found.map((p) => (
                <li key={p.id}>
                  <button onClick={() => startWithPerson(p.id)} className="flex w-full items-center gap-3 rounded-[14px] px-[10px] py-[10px] text-left hover:bg-bg">
                    <Avatar person={p} size={42} />
                    <span className="truncate text-[13px] font-bold">{p.name}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-6 text-center text-[13px] font-semibold text-muted">No one found</li>
            )
          ) : convs === null ? (
            <li className="px-3 py-6 text-center text-[13px] font-semibold text-muted">Loading…</li>
          ) : !list.length ? (
            <li className="px-3 py-6 text-center text-[13px] font-semibold text-muted">
              No chats yet.{" "}
              <button onClick={() => setFinding(true)} className="font-bold text-primary">Start one</button>
            </li>
          ) : (
            list.map((c) => {
              const unread = !!c.last && c.last.sender_id !== me.id && !c.last.read_at;
              const text = c.last ? (c.last.body || "📷 Photo") : "Say hi 👋";
              return (
                <li key={c.id}>
                  <button onClick={() => open(c.id)} className={`flex w-full items-center gap-3 rounded-[14px] px-[10px] py-[10px] text-left ${c.id === activeId ? "bg-bg" : "hover:bg-bg"}`}>
                    <Avatar person={c.other} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{c.other.name}</span>
                      <span className={`mt-1 flex gap-1 text-xs ${unread ? "font-bold text-ink" : "font-semibold text-muted"}`}>
                        <span className="truncate">{c.last?.sender_id === me.id ? `You: ${text}` : text}</span>
                        {c.last && <span className="shrink-0">· {time(c.last.created_at)}</span>}
                      </span>
                    </span>
                    {unread && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className={`min-w-0 flex-1 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-[13px] font-semibold text-muted">Pick a chat or start a new one.</div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-line px-[20px] py-[14px]">
              <button onClick={() => setActiveId(null)} aria-label="Back" className="text-muted md:hidden"><ArrowLeft className="size-5" /></button>
              <Avatar person={active.other} size={36} />
              <Link href={`/profile/${active.other.id}`} className="flex-1 text-[15px] font-bold hover:text-primary">{active.other.name}</Link>
              {active.other.role !== "member" && (
                <Link href={`/profile/${active.other.id}`} aria-label="Book a session" title="Book a session" className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft">
                  <CalendarClock className="size-4" />
                </Link>
              )}
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-[20px] py-[20px]">
              {msgs.map((m) => {
                const mine = m.sender_id === me.id;
                return (
                  <div key={m.id} className={`flex items-end gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                    {m.image_url ? (
                      <a href={m.image_url} target="_blank" rel="noreferrer" className="max-w-[60%]">
                        <img src={m.image_url} alt="" className="max-h-[280px] rounded-[12px] object-cover" />
                      </a>
                    ) : (
                      <p className={`max-w-[60%] whitespace-pre-line rounded-[12px] px-[12px] py-[9px] text-[13px] font-semibold leading-snug ${mine ? "bg-[#9b7dff] text-white" : "bg-bg text-ink"}`}>{m.body}</p>
                    )}
                    <span className="pb-1 text-[11px] font-semibold text-muted">{time(m.created_at)}</span>
                    {mine && (m.read_at ? <CheckCheck className="mb-1 size-4 text-primary" aria-label="Seen" /> : <Check className="mb-1 size-4 text-muted" aria-label="Sent" />)}
                  </div>
                );
              })}
              {!msgs.length && <p className="text-center text-[13px] font-semibold text-muted">Say hi to {active.other.name.split(" ")[0]} 👋</p>}
              <div ref={bottom} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-center gap-3 border-t border-line px-[20px] py-[14px]"
            >
              <Avatar person={me} size={36} />
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} placeholder="Write your message" className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-muted" />
              <span className="flex items-center gap-3 text-muted">
                <button type="button" aria-label="Emoji" onClick={() => setDraft((d) => d + "😊")} className="hover:text-primary max-sm:hidden"><Smile className="size-5" /></button>
                <button type="button" aria-label="Thumbs up" onClick={() => send("👍")} className="hover:text-primary max-sm:hidden"><ThumbsUp className="size-5" /></button>
                <label aria-label="Send a photo" className="cursor-pointer hover:text-primary">
                  <ImageIcon className="size-5" />
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => sendPhoto(e.target.files?.[0])} />
                </label>
              </span>
              <button disabled={sending} aria-label="Send" className="flex size-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-strong disabled:opacity-60"><SendHorizontal className="size-5" /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
