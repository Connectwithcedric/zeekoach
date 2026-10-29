import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession, sessions } from "@/lib/data";
import { BookingFlow } from "./booking-flow";
import { LiveBooking } from "./live-booking";

export const metadata: Metadata = { title: "Book a session" };

export function generateStaticParams() {
  return sessions.map((s) => ({ id: s.id }));
}

export default async function BookPage({ params }: PageProps<"/book/[id]">) {
  const { id } = await params;
  const session = getSession(id);
  if (session) return <BookingFlow session={session} />;
  // Sessions Koaches create live in the database and load in the browser.
  if (/^[0-9a-f-]{36}$/.test(id)) return <LiveBooking id={id} />;
  notFound();
}
