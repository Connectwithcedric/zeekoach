"use client";

import { SessionDetail } from "@/components/session-detail";
import { SessionExtras } from "@/components/session-extras";
import { SessionMissing } from "@/components/session-missing";
import { useFetchedSession } from "@/lib/live-data";

export function LiveSession({ id }: { id: string }) {
  const session = useFetchedSession(id);
  return session ? (
    <div className="mt-[30px] flex flex-col items-center gap-[30px] lg:flex-row lg:items-start lg:justify-center">
      <SessionDetail session={session} />
      <SessionExtras session={session} />
    </div>
  ) : (
    <SessionMissing loading={session === undefined} />
  );
}
