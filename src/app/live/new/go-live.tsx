"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthCard, FormMessage, NotConfigured, SubmitButton } from "@/components/auth-card";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

// Name your stream, check your camera, then go live. Your followers get a notification.
export function GoLive() {
  const router = useRouter();
  const { ready, user } = useAuth();
  // From a stream session's page: /live/new?session=<id> streams that session to the people who booked it.
  const sessionId = useSearchParams().get("session");
  const [title, setTitle] = useState("");
  useEffect(() => {
    if (!sessionId || !supabase) return;
    supabase.from("sessions").select("title").eq("id", sessionId).maybeSingle().then(({ data }) => data && setTitle(data.title));
  }, [sessionId]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) return;
    let media: MediaStream | null = null;
    let alive = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((m) => {
        if (!alive) return m.getTracks().forEach((t) => t.stop());
        media = m;
        if (video.current) video.current.srcObject = m;
        setCamOk(true);
      })
      .catch(() => alive && setCamOk(false));
    return () => {
      alive = false;
      media?.getTracks().forEach((t) => t.stop());
    };
  }, [user]);

  if (!supabase) return <AuthCard title="Go live"><NotConfigured /></AuthCard>;
  if (!ready) return <AuthCard title="Go live"><p className="text-[13px] font-semibold text-muted">Loading…</p></AuthCard>;
  if (!user)
    return (
      <AuthCard title="Go live" sub="Log in to stream to your followers.">
        <Link href="/login" className="flex h-11 items-center justify-center rounded-[12px] bg-primary text-[14px] font-bold text-white">Log in</Link>
      </AuthCard>
    );

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;
    setBusy(true);
    setMsg(null);
    await supabase.from("streams").update({ ended_at: new Date().toISOString() }).eq("host_id", user.id).is("ended_at", null);
    const { data, error } = await supabase.from("streams").insert({ host_id: user.id, title: title.trim(), session_id: sessionId }).select("id").single();
    setBusy(false);
    if (error || !data) return setMsg(error?.message ?? "Couldn't start the stream.");
    router.push(`/live/${data.id}`);
  }

  return (
    <AuthCard title={sessionId ? "Start your stream session" : "Go live"} sub={sessionId ? "Everyone who booked gets a notification, and only they can watch." : "Your followers get a notification when you start."}>
      <form onSubmit={start} className="space-y-5">
        <div className="relative aspect-video overflow-hidden rounded-[12px] bg-black">
          <video ref={video} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
          {camOk !== true && (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[12px] font-semibold text-white/80">
              {camOk === false ? "Camera blocked. Allow your camera and microphone in the browser." : "Starting your camera…"}
            </p>
          )}
        </div>
        <label className="block">
          <span className="text-[13px] font-bold">What are you streaming?</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} placeholder="Full body HIIT" className="mt-2 h-11 w-full rounded-[12px] bg-bg px-4 text-[14px] font-semibold outline-none ring-primary placeholder:text-muted focus:ring-2" />
        </label>
        {msg && <FormMessage tone="error">{msg}</FormMessage>}
        <SubmitButton busy={busy}>Go live</SubmitButton>
      </form>
    </AuthCard>
  );
}
