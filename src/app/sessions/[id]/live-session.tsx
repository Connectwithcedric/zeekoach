"use client";

import { SessionDetail } from "@/components/session-detail";
import { SessionMissing } from "@/components/session-missing";
import { useFetchedSession } from "@/lib/live-data";

export function LiveSession({ id }: { id: string }) {
  const session = useFetchedSession(id);
  return session ? (
    <div className="mt-[30px] flex justify-center">
      <SessionDetail session={session} />
    </div>
  ) : (
    <SessionMissing loading={session === undefined} />
  );
}
