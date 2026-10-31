"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Eye, MessageCircle, Mic, MicOff, SendHorizontal, ThumbsUp, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { TipButton } from "@/components/money-modal";
import { Avatar } from "@/components/ui";
import { getPerson, type Person } from "@/lib/data";
import { fetchStream, isLive, type Stream } from "@/lib/streams";
import { supabase } from "@/lib/supabase";

// Video goes straight from the host's browser to each viewer's (WebRTC).
// Supabase Realtime carries the connection setup, the chat, likes and who is watching.
const ice: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

type Who = { id: string; name: string; avatar: string | null };
type Signal =
  | { t: "hello"; from: string }
  | { t: "host-ready" }
  | { t: "offer"; to: string; sdp: RTCSessionDescriptionInit }
  | { t: "answer"; from: string; sdp: RTCSessionDescriptionInit }
  | { t: "ice"; to?: string; from?: string; c: RTCIceCandidateInit }
  | { t: "chat"; who: Who; text: string }
  | { t: "like"; n: number }
  | { t: "end" };

type Peer = { pc: RTCPeerConnection; queue: RTCIceCandidateInit[] };

const pad = (n: number) => String(n).padStart(2, "0");
const elapsed = (since: string) => Math.max(0, Math.floor((Date.now() - Date.parse(since)) / 1000));
const newViewerId = () => crypto.randomUUID();

function addIce(peer: Peer, c: RTCIceCandidateInit) {
  if (peer.pc.remoteDescription) peer.pc.addIceCandidate(c).catch(() => {});
  else peer.queue.push(c);
}
async function setRemote(peer: Peer, sdp: RTCSessionDescriptionInit) {
  await peer.pc.setRemoteDescription(sdp);
  peer.queue.splice(0).forEach((c) => peer.pc.addIceCandidate(c).catch(() => {}));
}

export function StreamRoom({ id }: { id: string }) {
  const [stream, setStream] = useState<Stream | null | undefined>(supabase ? undefined : null);
  useEffect(() => {
    let alive = true;
    fetchStream(id).then((s) => alive && setStream(s));
    return () => {
      alive = false;
    };
  }, [id]);

  if (stream === undefined) return <div className="mt-[30px] h-[560px] rounded-card bg-surface" />;
  if (!stream || !isLive(stream)) return <Ended host={stream ? getPerson(stream.host_id) : undefined} />;
  if (stream.session_id) return <BookedOnly stream={stream} />;
  return <Room stream={stream} />;
}

// A session stream: only the Koach and the people who booked get in.
function BookedOnly({ stream }: { stream: Stream }) {
  const { ready, user } = useAuth();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    supabase!.rpc("can_watch", { sid: stream.id }).then(({ data }) => alive && setOk(!!data));
    return () => {
      alive = false;
    };
  }, [ready, user, stream.id]);
  if (ok === null) return <div className="mt-[30px] h-[560px] rounded-card bg-surface" />;
  if (ok) return <Room stream={stream} />;
  return (
    <div className="mt-[30px] rounded-card bg-surface px-8 py-16 text-center">
      <p className="text-[15px] font-bold">This stream is for people who booked the session</p>
      <p className="mx-auto mt-1 max-w-[360px] text-[13px] font-semibold text-muted">{user ? "Book a spot to join it." : "Log in with the account you booked with."}</p>
      <Link href={user ? `/sessions/${stream.session_id}` : "/login"} className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">{user ? "See the session" : "Log in"}</Link>
    </div>
  );
}

function Ended({ host }: { host?: Person }) {
  return (
    <div className="mt-[30px] rounded-card bg-surface px-8 py-16 text-center">
      <p className="text-[15px] font-bold">This stream has ended</p>
      <p className="mx-auto mt-1 max-w-[360px] text-[13px] font-semibold text-muted">{host ? `Follow ${host.name} to hear when they go live again.` : "Check who's streaming now on the sessions page."}</p>
      <Link href={host ? `/profile/${host.id}` : "/sessions"} className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">
        {host ? `See ${host.name.split(" ")[0]}'s profile` : "See sessions"}
      </Link>
    </div>
  );
}

function Room({ stream }: { stream: Stream }) {
  const router = useRouter();
  const { ready, user, profile } = useAuth();
  const host = getPerson(stream.host_id) as Person;
  const isHost = !!user && user.id === stream.host_id;
  const uid = user && profile ? user.id : undefined;
  const name = profile?.name;
  const avatar = profile?.avatar_url ?? null;

  const [seconds, setSeconds] = useState(0);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [lines, setLines] = useState<{ who: Who; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [watchers, setWatchers] = useState<Who[]>([]);
  const [status, setStatus] = useState("Connecting…");
  const [ended, setEnded] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [muted, setMuted] = useState(true);

  const video = useRef<HTMLVideoElement>(null);
  const local = useRef<MediaStream | null>(null);
  const channel = useRef<RealtimeChannel | null>(null);
  const me = useRef<Who | null>(null);

  useEffect(() => {
    const tick = () => setSeconds(elapsed(stream.started_at));
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [stream.started_at]);

  useEffect(() => {
    const db = supabase;
    if (!db || !ready) return;
    const who: Who = uid ? { id: uid, name: name || "Member", avatar } : { id: newViewerId(), name: "Guest", avatar: null };
    me.current = who;
    const peers = new Map<string, Peer>();
    let viewer: Peer | null = null;
    let closed = false;
    let beat: ReturnType<typeof setInterval> | undefined;

    const ch = db.channel(`stream:${stream.id}`, { config: { broadcast: { self: false }, presence: { key: who.id } } });
    channel.current = ch;
    const send = (payload: Signal) => ch.send({ type: "broadcast", event: "sig", payload });

    // Host: one connection per viewer, each carrying the camera and mic.
    const callViewer = async (viewerId: string) => {
      const media = local.current;
      if (!media) return;
      peers.get(viewerId)?.pc.close();
      const peer: Peer = { pc: new RTCPeerConnection(ice), queue: [] };
      peers.set(viewerId, peer);
      media.getTracks().forEach((track) => peer.pc.addTrack(track, media));
      peer.pc.onicecandidate = (e) => e.candidate && send({ t: "ice", to: viewerId, c: e.candidate.toJSON() });
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      send({ t: "offer", to: viewerId, sdp: offer });
    };

    // Viewer: answer the host's call and show what comes in.
    const answerHost = async (sdp: RTCSessionDescriptionInit) => {
      viewer?.pc.close();
      const peer: Peer = { pc: new RTCPeerConnection(ice), queue: [] };
      viewer = peer;
      peer.pc.ontrack = (e) => {
        if (video.current) video.current.srcObject = e.streams[0];
        setStatus("");
      };
      peer.pc.onconnectionstatechange = () => {
        if (peer.pc.connectionState === "failed") setStatus("Couldn't connect to the video. Try reloading the page.");
      };
      peer.pc.onicecandidate = (e) => e.candidate && send({ t: "ice", from: who.id, c: e.candidate.toJSON() });
      await setRemote(peer, sdp);
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      send({ t: "answer", from: who.id, sdp: answer });
    };

    ch.on("broadcast", { event: "sig" }, ({ payload }: { payload: Signal }) => {
      const m = payload;
      if (m.t === "chat") setLines((l) => [...l.slice(-199), { who: m.who, text: m.text }]);
      else if (m.t === "like") setLikes((n) => Math.max(0, n + m.n));
      else if (m.t === "end") setEnded(true);
      else if (isHost) {
        if (m.t === "hello") callViewer(m.from);
        else if (m.t === "answer") {
          const peer = peers.get(m.from);
          if (peer) setRemote(peer, m.sdp).catch(() => {});
        } else if (m.t === "ice" && m.from) {
          const peer = peers.get(m.from);
          if (peer) addIce(peer, m.c);
        }
      } else {
        if (m.t === "host-ready") send({ t: "hello", from: who.id });
        else if (m.t === "offer" && m.to === who.id) answerHost(m.sdp).catch(() => setStatus("Couldn't connect to the video. Try reloading the page."));
        else if (m.t === "ice" && m.to === who.id && viewer) addIce(viewer, m.c);
      }
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Who>();
      setWatchers(Object.keys(state).filter((k) => k !== stream.host_id).map((k) => state[k][0]));
      if (!isHost && !viewer && !state[stream.host_id]) setStatus(`Waiting for ${host.name.split(" ")[0]} to connect…`);
    });
    ch.on("presence", { event: "leave" }, ({ key }: { key: string }) => {
      if (!isHost) return;
      peers.get(key)?.pc.close();
      peers.delete(key);
    });

    const join = () =>
      ch.subscribe(async (state) => {
        if (state !== "SUBSCRIBED" || closed) return;
        await ch.track(who);
        if (isHost) send({ t: "host-ready" });
        else send({ t: "hello", from: who.id });
      });

    if (isHost) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
        .then((media) => {
          if (closed) return media.getTracks().forEach((t) => t.stop());
          local.current = media;
          if (video.current) video.current.srcObject = media;
          setStatus("");
          join();
          const touch = () => db.from("streams").update({ seen_at: new Date().toISOString() }).eq("id", stream.id).then(() => {});
          touch();
          beat = setInterval(touch, 30_000);
        })
        .catch(() => setStatus("Allow your camera and microphone in the browser to go live."));
    } else join();

    return () => {
      closed = true;
      clearInterval(beat);
      peers.forEach((p) => p.pc.close());
      (viewer as Peer | null)?.pc.close();
      local.current?.getTracks().forEach((t) => t.stop());
      local.current = null;
      db.removeChannel(ch);
      channel.current = null;
    };
  }, [ready, uid, name, avatar, isHost, stream.id, stream.host_id, host.name]);

  const say = (payload: Signal) => channel.current?.send({ type: "broadcast", event: "sig", payload });

  const toggle = (kind: "audio" | "video", on: boolean) => {
    local.current?.getTracks().forEach((t) => t.kind === kind && (t.enabled = on));
    if (kind === "audio") setMic(on);
    else setCam(on);
  };

  const end = async () => {
    say({ t: "end" });
    await supabase?.from("streams").update({ ended_at: new Date().toISOString() }).eq("id", stream.id);
    local.current?.getTracks().forEach((t) => t.stop());
    router.push(`/profile/${stream.host_id}`);
  };

  if (ended && !isHost) return <Ended host={host} />;

  const time = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
  const chatter = (w: Who): Person => getPerson(w.id) ?? { ...host, id: w.id, name: w.name, avatarUrl: w.avatar ?? undefined, real: true };

  return (
    <div className="mt-[30px] overflow-hidden rounded-card bg-surface">
      <div className="flex">
        <div className="relative h-[calc(100vh-360px)] min-h-[380px] flex-1 bg-black">
          <video ref={video} autoPlay playsInline muted={isHost || muted} className={`size-full object-contain ${isHost ? "-scale-x-100" : ""}`} />
          {status && <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-[13px] font-semibold text-white/80">{status}</p>}
          <span className="absolute left-5 top-5 flex items-center gap-2 rounded-[8px] bg-black/60 px-3 py-1.5 text-[11px] font-bold text-white">
            <span className="size-2 animate-pulse rounded-full bg-live" /> LIVE <span className="font-semibold text-white/80">{time}</span>
          </span>
          <div className="absolute right-5 top-5 flex gap-3">
            <button
              onClick={() => {
                setLiked(!liked);
                setLikes((n) => Math.max(0, n + (liked ? -1 : 1)));
                say({ t: "like", n: liked ? -1 : 1 });
              }}
              disabled={isHost}
              className={`flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-xs font-bold text-white ${liked ? "bg-primary" : "bg-black/50"}`}
            >
              <ThumbsUp className="size-4" /> {likes}
            </button>
            <span className="flex h-10 items-center gap-1.5 rounded-[10px] bg-black/50 px-3 text-xs font-bold text-white"><Eye className="size-4" /> {watchers.length}</span>
            <button onClick={() => setChatOpen(!chatOpen)} aria-label="Live chat" className={`flex size-10 items-center justify-center rounded-[10px] text-white ${chatOpen ? "bg-primary" : "bg-black/50"}`}>
              <MessageCircle className="size-4" />
            </button>
          </div>
          {!isHost && !status && (
            <button onClick={() => setMuted(!muted)} className="absolute bottom-5 left-5 flex h-10 items-center gap-2 rounded-[10px] bg-black/60 px-3 text-xs font-bold text-white">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} {muted ? "Tap to unmute" : "Sound on"}
            </button>
          )}
        </div>

        {chatOpen && (
          <aside className="flex w-[300px] flex-col border-l border-line max-md:hidden">
            <p className="border-b border-line px-5 py-4 text-[15px] font-bold">Live chat</p>
            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {!lines.length && <li className="text-xs font-semibold text-muted">Say hi to {host.name.split(" ")[0]}!</li>}
              {lines.map((l, i) => (
                <li key={i} className="flex gap-2.5">
                  <Avatar person={chatter(l.who)} size={28} />
                  <p className="text-xs font-semibold leading-snug"><b>{l.who.name.split(" ")[0]}</b> <span className="text-muted">{l.text}</span></p>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {watchers.length > 0 && (
        <ul className="flex gap-[10px] overflow-x-auto px-5 pt-[10px]">
          {watchers.slice(0, 30).map((w) => (
            <li key={w.id} className="flex shrink-0 items-center gap-2 rounded-[12px] bg-bg px-3 py-2">
              <Avatar person={chatter(w)} size={24} />
              <span className="text-[11px] font-bold">{w.name.split(" ")[0]}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4 px-5 py-[14px]">
        <Link href={`/profile/${host.id}`} className="flex items-center gap-3 rounded-[12px] bg-bg px-3 py-2">
          <Avatar person={host} size={34} />
          <div>
            <p className="text-[13px] font-bold">{stream.title || "Live"}</p>
            <p className="text-[11px] font-semibold text-muted">with {host.name}</p>
          </div>
        </Link>
        {!isHost && host.real && <TipButton to={host} className="flex h-10 items-center gap-1.5 rounded-[10px] bg-bg px-3 text-[13px] font-bold text-primary" />}
        {isHost && (
          <div className="mx-auto flex gap-3">
            <button onClick={() => toggle("audio", !mic)} aria-label={mic ? "Mute" : "Unmute"} className={`flex size-10 items-center justify-center rounded-[10px] ${mic ? "bg-primary text-white" : "bg-bg text-primary"}`}>{mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}</button>
            <button onClick={() => toggle("video", !cam)} aria-label={cam ? "Turn camera off" : "Turn camera on"} className={`flex size-10 items-center justify-center rounded-[10px] ${cam ? "bg-primary text-white" : "bg-bg text-primary"}`}>{cam ? <Video className="size-4" /> : <VideoOff className="size-4" />}</button>
            <button onClick={end} className="flex h-10 items-center rounded-[10px] bg-live px-4 text-[13px] font-bold text-white">End stream</button>
          </div>
        )}
        {user && profile ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text || !me.current) return;
              const line = { who: me.current, text: text.slice(0, 300) };
              setLines((l) => [...l, line]);
              say({ t: "chat", ...line });
              setDraft("");
              setChatOpen(true);
            }}
            className="ml-auto flex w-[300px] items-center gap-3 max-sm:w-full"
          >
            <Avatar person={getPerson(user.id) ?? host} size={34} />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write your message" className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold outline-none placeholder:text-muted" />
            <button aria-label="Send" className="text-primary"><SendHorizontal className="size-4" /></button>
          </form>
        ) : (
          <p className="ml-auto text-[13px] font-semibold text-muted">
            <Link href="/login" className="font-bold text-primary">Log in</Link> to chat.
          </p>
        )}
      </div>
    </div>
  );
}
