import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionDetail } from "@/components/session-detail";
import { getSession, sessions } from "@/lib/data";
import { LiveSession } from "./live-session";

export function generateStaticParams() {
  return sessions.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sessions/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getSession(id)?.title ?? "Session" };
}

// Shareable link to one session: the same card as the Sessions page pop-up.
export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) {
    // Sessions Koaches create live in the database and load in the browser.
    if (/^[0-9a-f-]{36}$/.test(id)) return <LiveSession id={id} />;
    notFound();
  }
  return (
    <div className="mt-[30px] flex justify-center">
      <SessionDetail session={session} />
    </div>
  );
}
