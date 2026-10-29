"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, LayoutGrid, MessageCircle, Mic, MicOff, MoreHorizontal, SendHorizontal, ThumbsUp, Video, VideoOff, X } from "lucide-react";
import { Avatar, Photo } from "@/components/ui";
import { currentUserId, getPerson, people, type Person, type PhotoKey } from "@/lib/data";

const stage: Record<string, PhotoKey> = { tibere: "ropes", marija: "yoga", alphonso: "football", rajko: "hiit", kim: "yoga" };
const tiles: PhotoKey[] = ["yoga", "band", "hiit", "gym", "coach", "ropes", "swim", "run"];
const pad = (n: number) => String(n).padStart(2, "0");

type ChatLine = { who: string; text: string };

export function LiveRoom({ hostId }: { hostId: string }) {
  const host = getPerson(hostId) as Person;
  const me = getPerson(currentUserId) as Person;
  const [seconds, setSeconds] = useState(73 * 60 + 21);
  const [likes, setLikes] = useState(24);
  const [liked, setLiked] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [camError, setCamError] = useState("");
  const [pipOpen, setPipOpen] = useState(true);
  const [lines, setLines] = useState<ChatLine[]>([
    { who: "marija", text: "Let's go! 🔥" },
    { who: "kim", text: "Can you show the grip again?" },
  ]);
  const [draft, setDraft] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Your own camera in the small window, only after you turn it on.
  useEffect(() => {
    if (!cam) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      return;
    }
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream.current = s;
        if (video.current) video.current.srcObject = s;
        setCamError("");
      })
      .catch(() => {
        setCam(false);
        setCamError("Camera blocked. Allow it in your browser to show yourself.");
      });
  }, [cam]);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const time = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
  const crowd = people.filter((p) => p.id !== hostId && p.id !== currentUserId);

  return (
    <div className="mt-[30px] overflow-hidden rounded-card bg-surface">
      <div className="flex">
        <div className={`relative flex-1 bg-black transition-all ${collapsed ? "h-[260px]" : "h-[calc(100vh-360px)] min-h-[380px]"}`}>
          <Photo k={stage[hostId] ?? "gym"} w={1100} h={620} className="size-full opacity-95" alt={`${host.name} streaming ${host.streaming}`} />
          <span className="absolute left-5 top-5 flex items-center gap-2 rounded-[8px] bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white">
            <span className="size-2 animate-pulse rounded-full bg-live" /> LIVE <span className="font-semibold text-white/80">{time}</span>
          </span>
          <div className="absolute right-5 top-5 flex gap-3">
            <button
              onClick={() => {
                setLiked(!liked);
                setLikes((n) => n + (liked ? -1 : 1));
              }}
              className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-xs font-bold text-white ${liked ? "bg-primary" : "bg-black/50"}`}
            >
              <ThumbsUp className="size-4" /> {likes}
            </button>
            <span className="flex h-10 items-center gap-1.5 rounded-[10px] bg-black/50 px-3 text-xs font-bold text-white"><Eye className="size-4" /> {crowd.length + 70}</span>
            <button onClick={() => setChatOpen(!chatOpen)} aria-label="Live chat" className={`relative flex size-10 items-center justify-center rounded-[10px] text-white ${chatOpen ? "bg-primary" : "bg-black/50"}`}>
              <MessageCircle className="size-4" />
              {!chatOpen && <span className="absolute right-2 top-2 size-2 rounded-full bg-live" />}
            </button>
          </div>
          {pipOpen && (
            <div className="absolute bottom-5 left-5 h-[130px] w-[200px] overflow-hidden rounded-[14px] border-2 border-white/80 bg-[#22222a] max-sm:hidden">
              {cam ? <video ref={video} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" /> : <p className="flex size-full items-center justify-center px-4 text-center text-[11px] font-semibold text-white/70">{camError || "Turn on your camera to join on screen"}</p>}
              <button onClick={() => setPipOpen(false)} aria-label="Hide my camera" className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/50 text-white"><X className="size-3" /></button>
            </div>
          )}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
            <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand video" : "Collapse video"} className="flex h-8 w-14 items-center justify-center rounded-[8px] bg-black/50 text-white">
              <ChevronDown className={`size-5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            </button>
            <button onClick={() => setPipOpen(!pipOpen)} aria-label="Toggle my window" className="flex size-8 items-center justify-center rounded-[8px] bg-black/50 text-white"><LayoutGrid className="size-4" /></button>
          </div>
        </div>

        {chatOpen && (
          <aside className="flex w-[300px] flex-col border-l border-line max-md:hidden">
            <p className="border-b border-line px-5 py-4 text-[15px] font-bold">Live chat</p>
            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.map((l, i) => {
                const p = getPerson(l.who) as Person;
                return (
                  <li key={i} className="flex gap-2.5">
                    <Avatar person={p} size={28} />
                    <p className="text-xs font-semibold leading-snug"><b>{p.name.split(" ")[0]}</b> <span className="text-muted">{l.text}</span></p>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>

      <ul className="flex gap-[10px] overflow-x-auto px-5 pt-[10px]">
        {crowd.map((p, i) => (
          <li key={p.id} className="relative h-[96px] w-[146px] shrink-0 overflow-hidden rounded-[12px]">
            <Photo k={tiles[i % tiles.length]} w={146} h={96} className="size-full" />
            <span className="absolute bottom-1.5 left-2 text-[11px] font-bold text-white drop-shadow">{p.name}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-4 px-5 py-[14px]">
        <div className="flex items-center gap-3 rounded-[12px] bg-bg px-3 py-2">
          <Avatar person={host} size={34} />
          <div>
            <p className="text-[13px] font-bold">{host.streaming}</p>
            <p className="text-[11px] font-semibold text-muted">with {host.name}</p>
          </div>
        </div>
        <div className="mx-auto flex gap-3">
          <button onClick={() => setMic(!mic)} aria-label={mic ? "Mute" : "Unmute"} className={`flex size-10 items-center justify-center rounded-[10px] ${mic ? "bg-primary text-white" : "bg-bg text-primary"}`}>{mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}</button>
          <button
            onClick={() => {
              setPipOpen(true);
              setCam(!cam);
            }}
            aria-label={cam ? "Turn camera off" : "Turn camera on"}
            className={`flex size-10 items-center justify-center rounded-[10px] ${cam ? "bg-primary text-white" : "bg-bg text-primary"}`}
          >
            {cam ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </button>
          <button aria-label="More" className="flex size-10 items-center justify-center rounded-[10px] bg-bg text-primary"><MoreHorizontal className="size-4" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setLines((l) => [...l, { who: currentUserId, text: draft.trim() }]);
            setDraft("");
            setChatOpen(true);
          }}
          className="flex w-[300px] items-center gap-3 max-sm:w-full"
        >
          <Avatar person={me} size={34} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write your message" className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-muted" />
          <button aria-label="Send" className="text-primary"><SendHorizontal className="size-4" /></button>
        </form>
      </div>
    </div>
  );
}
