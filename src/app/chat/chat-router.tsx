"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { getPerson } from "@/lib/data";
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
