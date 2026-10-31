"use client";

import { useEffect, useRef, useState } from "react";
import { AtSign, CalendarClock, CheckCheck, Image as ImageIcon, MapPin, Mic, MoreHorizontal, Phone, Plus, Search, SendHorizontal, Smile, ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/ui";
import { currentUserId, getPerson, type Person } from "@/lib/data";

type Msg = { id: number; from: string; text: string; time: string };
type Thread = { id: string; with: string; messages: Msg[]; unread?: boolean };

const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const seed: Thread[] = [
  { id: "kim", with: "kim", messages: [
    { id: 1, from: "kim", text: "Hey Aleks! Is the 9AM tennis class still on tomorrow?", time: "8:21 PM" },
    { id: 2, from: "aleksandar", text: "Yes, see you at TeamFit at 9.", time: "8:24 PM" },
    { id: 3, from: "kim", text: "Great. Can I bring a friend?", time: "9:43 PM" },
    { id: 4, from: "aleksandar", text: "Of course, just add them when you book so they get a spot.", time: "9:51 PM" },
    { id: 5, from: "kim", text: "Ok. Talk to you soon!", time: "12:22 PM" },
  ] },
  { id: "tibere", with: "tibere", unread: true, messages: [{ id: 1, from: "tibere", text: "Hey Aleks! How are you?", time: "10:15 PM" }] },
  { id: "rajko", with: "rajko", messages: [{ id: 1, from: "aleksandar", text: "Thanks for the session today", time: "5:31 PM" }, { id: 2, from: "rajko", text: "Cool", time: "5:48 PM" }] },
  { id: "paityn", with: "paityn", messages: [{ id: 1, from: "paityn", text: "See you at 10pm", time: "9:32 AM" }] },
  { id: "stacey", with: "stacey", messages: [{ id: 1, from: "stacey", text: "Ok. Talk to you soon!", time: "Sun" }] },
  { id: "mia", with: "mia", messages: [{ id: 1, from: "mia", text: "Ok. Talk to you soon!", time: "Sat" }] },
  { id: "alphonso", with: "alphonso", messages: [{ id: 1, from: "alphonso", text: "Want to run a joint session at Ada?", time: "Fri" }] },
];

const replies = ["Sounds good!", "Perfect, thanks 🙌", "Ok. Talk to you soon!", "I agree with you!", "We'll see!"];

export function ChatBoard() {
  const [threads, setThreads] = useState(seed);
  const [activeId, setActiveId] = useState("kim");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const active = threads.find((t) => t.id === activeId)!;
  const other = getPerson(active.with) as Person;
  const me = getPerson(currentUserId) as Person;

  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [activeId, active.messages.length, typing]);

  const push = (id: string, m: Omit<Msg, "id">) =>
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, messages: [...t.messages, { ...m, id: t.messages.length + 1 }] } : t)));

  const send = (text: string) => {
    if (!text.trim()) return;
    const id = activeId;
    push(id, { from: currentUserId, text: text.trim(), time: now() });
    setDraft("");
    // Demo only: the other person "replies" after a moment.
    setTimeout(() => setTyping(true), 600);
    setTimeout(() => {
      setTyping(false);
      push(id, { from: active.with, text: replies[Math.floor(Math.random() * replies.length)], time: now() });
    }, 2200);
  };

  const list = threads.filter((t) => (getPerson(t.with) as Person).name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mt-[30px] flex h-[calc(100vh-190px)] min-h-[560px] overflow-hidden rounded-card bg-surface">
      <aside className={`flex w-full shrink-0 flex-col border-r border-line md:w-[300px] max-md:hidden`}>
        <div className="flex items-center gap-3 p-[15px]">
          <button aria-label="New chat" className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft"><Plus className="size-5" /></button>
          <label className="flex h-10 flex-1 items-center gap-2 rounded-[12px] bg-bg px-3 text-[13px] text-muted">
            <Search className="size-4" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" className="w-full bg-transparent font-semibold text-ink outline-none placeholder:text-muted" />
          </label>
        </div>
        <ul className="flex-1 space-y-[2px] overflow-y-auto px-[10px] pb-3">
          {list.map((t) => {
            const p = getPerson(t.with) as Person;
            const last = t.messages[t.messages.length - 1];
            return (
              <li key={t.id}>
                <button
                  onClick={() => {
                    setActiveId(t.id);
                    setThreads((ts) => ts.map((x) => (x.id === t.id ? { ...x, unread: false } : x)));
                  }}
                  className={`flex w-full items-center gap-3 rounded-[14px] px-[10px] py-[10px] text-left ${t.id === activeId ? "bg-bg" : "hover:bg-bg"}`}
                >
                  <Avatar person={p} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{p.name}</span>
                    <span className={`mt-1 flex gap-1 text-xs ${t.unread ? "font-bold text-ink" : "font-semibold text-muted"}`}>
                      <span className="truncate">{last.from === currentUserId ? `You: ${last.text}` : last.text}</span>
                      <span className="shrink-0">· {last.time}</span>
                    </span>
                  </span>
                  {t.unread && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-[20px] py-[14px]">
          <Avatar person={other} size={36} />
          <a href={`/profile/${other.id}`} className="flex-1 text-[15px] font-bold hover:text-primary">{other.name}</a>
          {[{ l: "Book a session", I: CalendarClock }, { l: "Call", I: Phone }, { l: "More", I: MoreHorizontal }].map(({ l, I }) => (
            <button key={l} aria-label={l} className="flex size-9 items-center justify-center rounded-[10px] bg-bg text-primary hover:bg-primary-soft"><I className="size-4" /></button>
          ))}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-[20px] py-[20px]">
          {active.messages.map((m) => {
            const mine = m.from === currentUserId;
            return (
              <div key={m.id} className={`flex items-end gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                <p className={`max-w-[60%] rounded-[12px] px-[12px] py-[9px] text-[13px] font-semibold leading-snug ${mine ? "bg-[#9b7dff] text-white" : "bg-bg text-ink"}`}>{m.text}</p>
                <span className="pb-1 text-[11px] font-semibold text-muted">{m.time}</span>
                {mine && <CheckCheck className="mb-1 size-4 text-primary" aria-label="Seen" />}
              </div>
            );
          })}
          {typing && <p className="text-[11px] font-bold text-muted">{other.name.split(" ")[0]} is typing…</p>}
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
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write your message" className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-muted" />
          <span className="hidden items-center gap-3 text-muted sm:flex">
            <button type="button" aria-label="Emoji" onClick={() => setDraft((d) => d + "😊")} className="hover:text-primary"><Smile className="size-5" /></button>
            <button type="button" aria-label="Thumbs up" onClick={() => send("👍")} className="hover:text-primary"><ThumbsUp className="size-5" /></button>
            <button type="button" aria-label="Mention" className="hover:text-primary"><AtSign className="size-5" /></button>
            <button type="button" aria-label="Photo or video" className="hover:text-primary"><ImageIcon className="size-5" /></button>
            <button type="button" aria-label="Voice message" className="hover:text-primary"><Mic className="size-5" /></button>
            <button type="button" aria-label="Location" className="hover:text-primary"><MapPin className="size-5" /></button>
          </span>
          <button aria-label="Send" className="flex size-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-strong"><SendHorizontal className="size-5" /></button>
        </form>
      </section>
    </div>
  );
}
