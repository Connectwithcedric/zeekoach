"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarClock, CheckCheck, Check, CornerUpLeft, Image as ImageIcon, LogOut, Paperclip, Plus, Search, SendHorizontal, Smile, ThumbsUp, Trash2, UserPlus, Users, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { PeoplePicker } from "@/components/people-picker";
import { ProfileAvatar } from "@/components/profile-avatar";
import { SharedCard } from "@/components/shared-card";
import { Avatar } from "@/components/ui";
import { getPerson, type Person } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase, type Profile } from "@/lib/supabase";

export type Msg = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  share_type: string | null;
  share_id: string | null;
  reply_to: string | null;
  deleted_at: string | null;
  read_at: string | null;
  created_at: string;
};
type Conv = { id: string; group: boolean; title: string; createdBy: string | null; members: Profile[]; other?: Person; last?: Msg; lastRead?: string };

const time = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { weekday: "short" });
};
const uploadPath = (uid: string, f: File) => `${uid}/chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${f.name.split(".").pop() || "bin"}`;
const preview = (m: Msg) => (m.deleted_at ? "Message deleted" : m.body || (m.image_url ? "📷 Photo" : m.file_url ? `📎 ${m.file_name ?? "File"}` : m.share_type ? `Shared a ${m.share_type}` : ""));

async function loadConversations(me: string): Promise<Conv[]> {
  const db = supabase!;
  const { data: convs } = await db.from("conversations").select("id, user_a, user_b, is_group, title, created_by, last_at, conversation_members(user_id, last_read_at)").order("last_at", { ascending: false }).limit(100);
  if (!convs?.length) return [];
  type Row = { id: string; is_group: boolean; title: string; created_by: string | null; conversation_members: { user_id: string; last_read_at: string }[] };
  const rows = convs as unknown as Row[];
  const ids = [...new Set(rows.flatMap((c) => c.conversation_members.map((m) => m.user_id)))];
  const [{ data: profiles }, { data: msgs }] = await Promise.all([
    db.from("profiles").select("*").in("id", ids),
    db.from("messages").select("*").in("conversation_id", rows.map((c) => c.id)).order("created_at", { ascending: false }).limit(500),
  ]);
  const byId = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  byId.forEach(registerProfile);
  return rows.flatMap((c) => {
    const members = c.conversation_members.map((m) => byId.get(m.user_id)).filter(Boolean) as Profile[];
    const otherId = c.conversation_members.find((m) => m.user_id !== me)?.user_id;
    const other = !c.is_group && otherId ? getPerson(otherId) : undefined;
    if (!c.is_group && !other) return [];
    return [{
      id: c.id,
      group: c.is_group,
      title: c.is_group ? c.title : other!.name,
      createdBy: c.created_by,
      members,
      other,
      last: (msgs as Msg[] | null)?.find((m) => m.conversation_id === c.id),
      lastRead: c.conversation_members.find((m) => m.user_id === me)?.last_read_at,
    }];
  });
}

const unreadIn = (c: Conv, me: string) => !!c.last && c.last.sender_id !== me && (c.group ? !!c.lastRead && c.last.created_at > c.lastRead : !c.last.read_at);

// Chat like the old app: one-to-one and group chats, replies, deleting, photos, files and shared posts or sessions.
export function RealChat({ me, startWith }: { me: Person; startWith: string | null }) {
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [finding, setFinding] = useState(false);
  const [found, setFound] = useState<Person[]>([]);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [grouping, setGrouping] = useState<"new" | "add" | null>(null);
  const [groupTitle, setGroupTitle] = useState("");
  const [picked, setPicked] = useState<Profile[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  const refresh = useCallback(() => loadConversations(me.id).then(setConvs), [me.id]);

  const markRead = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      await Promise.all([
        supabase!.from("messages").update({ read_at: now }).eq("conversation_id", id).neq("sender_id", me.id).is("read_at", null),
        supabase!.from("conversation_members").update({ last_read_at: now }).eq("conversation_id", id).eq("user_id", me.id),
      ]);
      setConvs((cs) => cs?.map((c) => (c.id === id ? { ...c, lastRead: now, last: c.last && c.last.sender_id !== me.id ? { ...c.last, read_at: now } : c.last } : c)) ?? cs);
    },
    [me.id],
  );

  const open = useCallback(
    async (id: string) => {
      setActiveId(id);
      setReplyTo(null);
      setShowMembers(false);
      const { data } = await supabase!.from("messages").select("*").eq("conversation_id", id).order("created_at").limit(500);
      setMsgs((data as Msg[]) ?? []);
      await markRead(id);
    },
    [markRead],
  );

  const startWithPerson = useCallback(
    async (otherId: string) => {
      const { data: cid, error } = await supabase!.rpc("start_conversation", { other: otherId });
      if (error || !cid) return setError(error?.message ?? "Couldn't start the chat.");
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

  // New and changed messages in any of your chats arrive here live.
  useEffect(() => {
    const channel = supabase!
      .channel(`messages-${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        if (m.conversation_id === activeRef.current) {
          setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
          if (m.sender_id !== me.id) markRead(m.conversation_id);
        }
        setConvs((cs) => {
          if (!cs?.some((c) => c.id === m.conversation_id)) {
            refresh();
            return cs;
          }
          const updated = cs.map((c) => (c.id === m.conversation_id ? { ...c, last: m } : c));
          return [...updated.filter((c) => c.id === m.conversation_id), ...updated.filter((c) => c.id !== m.conversation_id)];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((list) => list.map((x) => (x.id === m.id ? m : x)));
      })
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [me.id, refresh, markRead]);

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

  async function send(fields: Partial<Msg>) {
    if (!activeId) return;
    setSending(true);
    setError("");
    const { data, error } = await supabase!
      .from("messages")
      .insert({ conversation_id: activeId, sender_id: me.id, body: "", reply_to: replyTo?.id ?? null, ...fields })
      .select("*")
      .single();
    setSending(false);
    if (error || !data) return setError(error?.message ?? "Couldn't send.");
    setDraft("");
    setReplyTo(null);
    const m = data as Msg;
    setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    setConvs((cs) => {
      const updated = cs?.map((c) => (c.id === m.conversation_id ? { ...c, last: m } : c)) ?? [];
      return [...updated.filter((c) => c.id === m.conversation_id), ...updated.filter((c) => c.id !== m.conversation_id)];
    });
  }

  async function sendFile(file: File | undefined, kind: "image" | "file") {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return setError("Files can be up to 20 MB.");
    setSending(true);
    const path = uploadPath(me.id, file);
    const { error } = await supabase!.storage.from("posts").upload(path, file, { contentType: file.type || "application/octet-stream" });
    setSending(false);
    if (error) return setError(`Upload failed: ${error.message}`);
    const url = supabase!.storage.from("posts").getPublicUrl(path).data.publicUrl;
    send(kind === "image" ? { image_url: url } : { file_url: url, file_name: file.name.slice(0, 120) });
  }

  async function remove(m: Msg) {
    const { error } = await supabase!.from("messages").update({ deleted_at: new Date().toISOString(), body: "", image_url: null, file_url: null, file_name: null, share_type: null, share_id: null }).eq("id", m.id);
    if (error) return setError(error.message);
    setMsgs((list) => list.map((x) => (x.id === m.id ? { ...x, deleted_at: new Date().toISOString(), body: "", image_url: null, file_url: null, share_id: null, share_type: null } : x)));
  }

  async function saveGroup() {
    if (!picked.length) return;
    if (grouping === "new") {
      const { data, error } = await supabase!.rpc("create_group", { title: groupTitle, members: picked.map((p) => p.id) });
      if (error) return setError(error.message);
      await refresh();
      await open(data as string);
    } else if (activeId) {
      const { error } = await supabase!.rpc("add_group_members", { cid: activeId, members: picked.map((p) => p.id) });
      if (error) return setError(error.message);
      await refresh();
    }
    setGrouping(null);
    setPicked([]);
    setGroupTitle("");
  }

  async function removeMember(cid: string, uid: string) {
    const { error } = await supabase!.rpc("remove_group_member", { cid, member: uid });
    if (error) return setError(error.message);
    if (uid === me.id) {
      setActiveId(null);
      setMsgs([]);
    }
    await refresh();
  }

  const active = convs?.find((c) => c.id === activeId);
  const list = (convs ?? []).filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
  const sender = (id: string) => active?.members.find((p) => p.id === id);

  return (
    <div className="mt-[30px] flex h-[calc(100vh-190px)] min-h-[560px] overflow-hidden rounded-card bg-surface">
      <aside className={`w-full shrink-0 flex-col border-r border-line md:flex md:w-[300px] ${activeId ? "hidden" : "flex"}`}>
        <div className="flex items-center gap-2 p-[15px]">
          <button onClick={() => setFinding((f) => !f)} aria-label={finding ? "Close" : "New chat"} title="New chat" className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft">
            {finding ? <X className="size-5" /> : <Plus className="size-5" />}
          </button>
          <button onClick={() => setGrouping("new")} aria-label="New group" title="New group" className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft">
            <Users className="size-5" />
          </button>
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-bg px-3 text-[13px] text-muted">
            <Search className="size-4 shrink-0" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={finding ? "Find people" : "Search chats"} className="w-full min-w-0 bg-transparent font-semibold text-ink outline-none placeholder:text-muted" />
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
              const unread = unreadIn(c, me.id);
              const text = c.last ? preview(c.last) : "Say hi 👋";
              const who = c.last && c.group && c.last.sender_id !== me.id ? `${c.members.find((p) => p.id === c.last!.sender_id)?.name.split(" ")[0] ?? ""}: ` : "";
              return (
                <li key={c.id}>
                  <button onClick={() => open(c.id)} className={`flex w-full items-center gap-3 rounded-[14px] px-[10px] py-[10px] text-left ${c.id === activeId ? "bg-bg" : "hover:bg-bg"}`}>
                    {c.group ? <GroupAvatar members={c.members} /> : <Avatar person={c.other!} size={42} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{c.title}</span>
                      <span className={`mt-1 flex gap-1 text-xs ${unread ? "font-bold text-ink" : "font-semibold text-muted"}`}>
                        <span className="truncate">{c.last?.sender_id === me.id ? `You: ${text}` : who + text}</span>
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
              {active.group ? <GroupAvatar members={active.members} size={36} /> : <Avatar person={active.other!} size={36} />}
              {active.group ? (
                <button onClick={() => setShowMembers((s) => !s)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[15px] font-bold">{active.title}</span>
                  <span className="block text-[11px] font-semibold text-muted">{active.members.length} members</span>
                </button>
              ) : (
                <Link href={`/profile/${active.other!.id}`} className="flex-1 text-[15px] font-bold hover:text-primary">{active.title}</Link>
              )}
              {active.group && (
                <button onClick={() => setGrouping("add")} aria-label="Add people" title="Add people" className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft"><UserPlus className="size-4" /></button>
              )}
              {!active.group && active.other!.role !== "member" && (
                <Link href={`/profile/${active.other!.id}`} aria-label="Book a session" title="Book a session" className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft">
                  <CalendarClock className="size-4" />
                </Link>
              )}
            </header>
            {showMembers && active.group && (
              <div className="border-b border-line bg-bg px-[20px] py-3">
                <ul className="flex flex-wrap gap-2">
                  {active.members.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 text-[12px] font-bold">
                      <ProfileAvatar profile={p} size={22} /> {p.id === me.id ? "You" : p.name}
                      {active.createdBy === me.id && p.id !== me.id && (
                        <button aria-label={`Remove ${p.name}`} onClick={() => removeMember(active.id, p.id)} className="text-muted hover:text-live"><X className="size-3" /></button>
                      )}
                    </li>
                  ))}
                </ul>
                <button onClick={() => removeMember(active.id, me.id)} className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-live"><LogOut className="size-3.5" /> Leave group</button>
              </div>
            )}
            <div className="flex-1 space-y-3 overflow-y-auto px-[20px] py-[20px]">
              {msgs.map((m) => {
                const mine = m.sender_id === me.id;
                const quoted = m.reply_to ? msgs.find((x) => x.id === m.reply_to) : undefined;
                const system = active.group && /^(created the group|added |removed |left the group)/.test(m.body) && !m.image_url && !m.file_url && !m.share_id;
                if (system)
                  return <p key={m.id} className="text-center text-[11px] font-semibold text-muted">{mine ? "You" : sender(m.sender_id)?.name ?? "Someone"} {m.body}</p>;
                return (
                  <div key={m.id} className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    {active.group && !mine && (sender(m.sender_id) ? <ProfileAvatar profile={sender(m.sender_id)!} size={26} /> : <span className="size-[26px]" />)}
                    <div className={`flex max-w-[65%] flex-col ${mine ? "items-end" : "items-start"}`}>
                      {active.group && !mine && <span className="mb-0.5 text-[11px] font-bold text-muted">{sender(m.sender_id)?.name ?? "Former member"}</span>}
                      {quoted && (
                        <span className="mb-1 max-w-full truncate rounded-[10px] border-l-2 border-primary bg-bg px-2 py-1 text-[11px] font-semibold text-muted">
                          {quoted.sender_id === me.id ? "You" : sender(quoted.sender_id)?.name ?? active.title}: {preview(quoted)}
                        </span>
                      )}
                      {m.deleted_at ? (
                        <p className="rounded-[12px] border border-line px-[12px] py-[9px] text-[13px] font-semibold italic text-muted">Message deleted</p>
                      ) : m.image_url ? (
                        <a href={m.image_url} target="_blank" rel="noreferrer"><img src={m.image_url} alt="" className="max-h-[280px] rounded-[12px] object-cover" /></a>
                      ) : m.file_url ? (
                        <a href={m.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-[12px] bg-bg px-[12px] py-[9px] text-[13px] font-bold text-primary"><Paperclip className="size-4" /> {m.file_name ?? "File"}</a>
                      ) : m.share_type && m.share_id ? (
                        <SharedCard type={m.share_type} id={m.share_id} />
                      ) : null}
                      {!m.deleted_at && m.body && (
                        <p className={`mt-1 whitespace-pre-line rounded-[12px] px-[12px] py-[9px] text-[13px] font-semibold leading-snug ${mine ? "bg-[#9b7dff] text-white" : "bg-bg text-ink"}`}>{m.body}</p>
                      )}
                    </div>
                    <span className="flex flex-col items-center gap-1 pb-1">
                      {!m.deleted_at && (
                        <span className="hidden gap-1 group-hover:flex">
                          <button aria-label="Reply" title="Reply" onClick={() => setReplyTo(m)} className="text-muted hover:text-primary"><CornerUpLeft className="size-3.5" /></button>
                          {mine && <button aria-label="Delete" title="Delete" onClick={() => remove(m)} className="text-muted hover:text-live"><Trash2 className="size-3.5" /></button>}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-muted">{time(m.created_at)}</span>
                    </span>
                    {mine && !active.group && (m.read_at ? <CheckCheck className="mb-1 size-4 text-primary" aria-label="Seen" /> : <Check className="mb-1 size-4 text-muted" aria-label="Sent" />)}
                  </div>
                );
              })}
              {!msgs.length && <p className="text-center text-[13px] font-semibold text-muted">Say hi to {active.group ? "the group" : active.title.split(" ")[0]} 👋</p>}
              <div ref={bottom} />
            </div>
            {error && <p className="mx-[20px] mb-2 rounded-[10px] bg-[#fdecee] px-3 py-2 text-[12px] font-semibold text-live">{error}</p>}
            {replyTo && (
              <p className="mx-[20px] flex items-center justify-between rounded-t-[10px] bg-bg px-3 py-2 text-[12px] font-semibold text-muted">
                <span className="truncate">Replying to {replyTo.sender_id === me.id ? "yourself" : sender(replyTo.sender_id)?.name ?? active.title}: {preview(replyTo)}</span>
                <button aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X className="size-3.5" /></button>
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) send({ body: draft.trim() });
              }}
              className="flex items-center gap-3 border-t border-line px-[20px] py-[14px]"
            >
              <Avatar person={me} size={36} />
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} placeholder="Write your message" className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-muted" />
              <span className="flex items-center gap-3 text-muted">
                <button type="button" aria-label="Emoji" onClick={() => setDraft((d) => d + "😊")} className="hover:text-primary max-sm:hidden"><Smile className="size-5" /></button>
                <button type="button" aria-label="Thumbs up" onClick={() => send({ body: "👍" })} className="hover:text-primary max-sm:hidden"><ThumbsUp className="size-5" /></button>
                <label aria-label="Send a photo" title="Photo" className="cursor-pointer hover:text-primary">
                  <ImageIcon className="size-5" />
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => sendFile(e.target.files?.[0], "image")} />
                </label>
                <label aria-label="Send a file" title="File" className="cursor-pointer hover:text-primary">
                  <Paperclip className="size-5" />
                  <input type="file" className="sr-only" onChange={(e) => sendFile(e.target.files?.[0], "file")} />
                </label>
              </span>
              <button disabled={sending} aria-label="Send" className="flex size-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-strong disabled:opacity-60"><SendHorizontal className="size-5" /></button>
            </form>
          </>
        )}
      </section>

      {grouping && (
        <Modal label={grouping === "new" ? "New group" : "Add people"} onClose={() => setGrouping(null)}>
          <div className="w-[400px] max-w-full rounded-[10px] bg-surface p-6">
            <h2 className="text-center text-[15px] font-bold">{grouping === "new" ? "New group" : "Add people"}</h2>
            {grouping === "new" && (
              <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={60} placeholder="Group name" className="mt-5 h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none placeholder:text-muted" />
            )}
            <div className="mt-4">
              <PeoplePicker value={picked} onChange={setPicked} exclude={[me.id, ...(grouping === "add" ? active?.members.map((p) => p.id) ?? [] : [])]} placeholder="Add people" />
            </div>
            <button disabled={!picked.length} onClick={saveGroup} className="mt-5 h-10 w-full rounded-[10px] bg-primary text-[13px] font-bold text-white disabled:bg-[#d9d2ff]">
              {grouping === "new" ? "Create group" : "Add"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function GroupAvatar({ members, size = 42 }: { members: Profile[]; size?: number }) {
  const two = members.slice(0, 2);
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      {two[0] && <span className="absolute left-0 top-0"><ProfileAvatar profile={two[0]} size={size * 0.7} /></span>}
      {two[1] && <span className="absolute bottom-0 right-0 rounded-[10px] ring-2 ring-surface"><ProfileAvatar profile={two[1]} size={size * 0.7} /></span>}
    </span>
  );
}
