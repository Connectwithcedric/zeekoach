"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Send } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { ProfileAvatar } from "@/components/profile-avatar";
import { supabase, type Profile } from "@/lib/supabase";

type Target = { id: string; title: string; members: Profile[] };

// "Send in chat": shares a post, session, class, place, profile or challenge into one or more of your chats.
export function ShareToChat({ type, id, className = "", label = "Send in chat" }: { type: "post" | "session" | "class" | "place" | "profile" | "challenge"; id: string; className?: string; label?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [people, setPeople] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase!.from("conversations").select("id, is_group, title, last_at, conversation_members(user_id, profile:profiles(*))").order("last_at", { ascending: false }).limit(30);
      type Row = { id: string; is_group: boolean; title: string; conversation_members: { user_id: string; profile: Profile }[] };
      if (!alive) return;
      setTargets(((data ?? []) as unknown as Row[]).map((c) => {
        const others = c.conversation_members.filter((m) => m.user_id !== user.id).map((m) => m.profile).filter(Boolean);
        return { id: c.id, title: c.is_group ? c.title : others[0]?.name ?? "Chat", members: others };
      }));
    })();
    return () => {
      alive = false;
    };
  }, [open, user]);

  useEffect(() => {
    const q = query.trim().replace(/[%,()]/g, "");
    if (!open || !user || !q) return;
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase!.from("profiles").select("*").neq("id", user.id).or(`name.ilike.%${q}%,username.ilike.%${q}%`).limit(10);
      if (alive) setPeople((data as Profile[]) ?? []);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open, user, query]);

  async function sendTo(cid: string, key = cid) {
    if (!user) return;
    const { error } = await supabase!.from("messages").insert({ conversation_id: cid, sender_id: user.id, body: "", share_type: type, share_id: id });
    if (!error) setSent((s) => [...s, key]);
  }

  async function sendToPerson(p: Profile) {
    const { data: cid } = await supabase!.rpc("start_conversation", { other: p.id });
    if (cid) await sendTo(cid as string, p.id);
  }

  const shown = query.trim()
    ? people
    : [];
  const chats = (targets ?? []).filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : router.push("/login"))}
        className={className || "flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-primary"}
        aria-label={label}
        title={label}
      >
        <Send className="size-5" /> {className ? label : null}
      </button>
      {open && (
        <Modal label={label} onClose={() => setOpen(false)}>
          <div className="w-[400px] max-w-full rounded-[10px] bg-surface p-6">
            <h2 className="text-center text-[15px] font-bold">{label}</h2>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats and people" className="mt-5 h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none placeholder:text-muted" />
            <ul className="mt-3 max-h-[340px] space-y-1 overflow-y-auto">
              {targets === null && <li className="py-4 text-center text-[13px] font-semibold text-muted">Loading…</li>}
              {chats.map((t) => (
                <Row key={t.id} title={t.title} avatar={t.members[0]} done={sent.includes(t.id)} onSend={() => sendTo(t.id)} />
              ))}
              {shown.filter((p) => !chats.some((c) => c.members.length === 1 && c.members[0].id === p.id)).map((p) => (
                <Row key={p.id} title={p.name} avatar={p} done={sent.includes(p.id)} onSend={() => sendToPerson(p)} />
              ))}
              {targets !== null && !chats.length && !shown.length && <li className="py-4 text-center text-[13px] font-semibold text-muted">{query ? "No one found" : "Search for someone to send it to"}</li>}
            </ul>
          </div>
        </Modal>
      )}
    </>
  );
}

function Row({ title, avatar, done, onSend }: { title: string; avatar?: Profile; done: boolean; onSend: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-bg">
      {avatar ? <ProfileAvatar profile={avatar} size={36} /> : <span className="size-9 rounded-[10px] bg-bg" />}
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{title}</span>
      <button disabled={done} onClick={onSend} className={`flex h-8 items-center gap-1 rounded-[8px] px-3 text-[12px] font-bold ${done ? "bg-bg text-muted" : "bg-primary text-white"}`}>
        {done ? <><Check className="size-3.5" /> Sent</> : "Send"}
      </button>
    </li>
  );
}
