"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ellipsis } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/modal";
import { supabase } from "@/lib/supabase";

const reasons = ["Spam", "Fake account", "Nudity or sexual content", "Hate speech or symbols", "Bullying or harassment", "Scam or fraud", "Violence", "Something else"];

// The "..." on a profile: share, mute, block and report, like the old app.
export function ProfileMenu({ personId, name, real }: { personId: string; name: string; real: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [report, setReport] = useState(false);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const mine = user?.id === personId;

  useEffect(() => {
    if (!supabase || !user || !real || mine) return;
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id).eq("blocked_id", personId).maybeSingle().then(({ data }) => setBlocked(!!data));
    supabase.from("mutes").select("muted_id").eq("muter_id", user.id).eq("muted_id", personId).maybeSingle().then(({ data }) => setMuted(!!data));
  }, [user, personId, real, mine]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const flash = (t: string) => {
    setNote(t);
    setTimeout(() => setNote(""), 2500);
  };

  async function toggle(table: "blocks" | "mutes") {
    setOpen(false);
    if (!supabase || !real) return flash("Only works on real accounts.");
    if (!user) return router.push("/login");
    const [me, them, on, set] = table === "blocks" ? ["blocker_id", "blocked_id", blocked, setBlocked] as const : ["muter_id", "muted_id", muted, setMuted] as const;
    const { error } = on
      ? await supabase.from(table).delete().eq(me, user.id).eq(them, personId)
      : table === "blocks"
        ? await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: personId })
        : await supabase.from("mutes").insert({ muter_id: user.id, muted_id: personId });
    if (error) return flash(error.message);
    set(!on);
    flash(table === "blocks" ? (on ? `${name} is unblocked.` : `${name} is blocked. You no longer follow each other.`) : on ? `${name} is unmuted.` : `You won't see ${name}'s posts in your feed.`);
  }

  async function send(reason: string) {
    if (!supabase || !user) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, target_type: "user", target_id: personId, reason });
    setReport(false);
    flash(error ? error.message : "Thanks. Our team will look at this profile.");
  }

  const item = "block w-full px-4 py-2.5 text-left text-[13px] font-bold hover:bg-bg";
  return (
    <div ref={ref} className="absolute right-[25px] top-[14px]">
      <button aria-label="Profile options" aria-expanded={open} onClick={() => setOpen(!open)} className="text-primary">
        <Ellipsis className="size-5" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-[12px] bg-surface py-1 shadow-[0_10px_30px_rgba(25,26,30,0.15)]">
          <button className={item} onClick={() => { navigator.clipboard?.writeText(`${location.origin}/profile/${personId}`); setOpen(false); flash("Profile link copied."); }}>Copy profile link</button>
          {!mine && (
            <>
              <button className={item} onClick={() => toggle("mutes")}>{muted ? "Unmute" : "Mute"}</button>
              <button className={`${item} text-live`} onClick={() => toggle("blocks")}>{blocked ? "Unblock" : "Block"}</button>
              <button className={`${item} text-live`} onClick={() => { setOpen(false); if (!user) return router.push("/login"); if (!real) return flash("Only works on real accounts."); setReport(true); }}>Report</button>
            </>
          )}
        </div>
      )}
      {note && <p className="absolute right-0 top-8 z-30 w-60 rounded-[10px] bg-ink px-3 py-2 text-[12px] font-semibold text-white">{note}</p>}
      {report && (
        <Modal label="Report" onClose={() => setReport(false)}>
          <div className="w-[360px] max-w-full rounded-[10px] bg-surface p-6">
            <h2 className="text-center text-[15px] font-bold">Why are you reporting {name}?</h2>
            <ul className="mt-4 divide-y divide-line">
              {reasons.map((r) => (
                <li key={r}><button onClick={() => send(r)} className="w-full py-3 text-left text-[13px] font-bold hover:text-primary">{r}</button></li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}
