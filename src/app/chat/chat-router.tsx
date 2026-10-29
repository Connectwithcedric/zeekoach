"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getPerson, showSamples } from "@/lib/data";
import { registerProfile } from "@/lib/live-data";
import { supabase } from "@/lib/supabase";
import { ChatBoard } from "./chat-board";
import { RealChat } from "./real-chat";

// Signed-in people get real chat; visitors see the demo with a prompt to log in.
export function ChatRouter() {
  const startWith = useSearchParams().get("with");
  const { ready, user, profile } = useAuth();
  if (!ready) return <div className="mt-[30px] h-[560px] rounded-card bg-surface" />;
  if (supabase && user && profile) {
    registerProfile(profile);
    return <RealChat me={getPerson(profile.id)!} startWith={startWith} />;
  }
  if (!showSamples)
    return (
      <div className="mt-[30px] rounded-card bg-surface px-8 py-16 text-center">
        <p className="text-[15px] font-bold">Chat with Koaches and friends</p>
        <p className="mx-auto mt-1 max-w-[360px] text-[13px] font-semibold text-muted">Log in to send messages and photos.</p>
        <Link href="/login" className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-primary px-5 text-[13px] font-bold text-white">
          Log in
        </Link>
      </div>
    );
  return (
    <>
      {supabase && (
        <p className="mt-[30px] rounded-card bg-surface px-5 py-3 text-center text-[13px] font-semibold text-muted">
          This is a preview. <Link href="/login" className="font-bold text-primary">Log in</Link> to chat with real people.
        </p>
      )}
      <ChatBoard />
    </>
  );
}
