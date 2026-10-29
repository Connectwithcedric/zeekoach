"use client";

import { SessionMissing } from "@/components/session-missing";
import { useFetchedSession } from "@/lib/live-data";
import { BookingFlow } from "./booking-flow";

export function LiveBooking({ id }: { id: string }) {
  const session = useFetchedSession(id);
  return session ? <BookingFlow session={session} /> : <SessionMissing loading={session === undefined} />;
}
