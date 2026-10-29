import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession, sessions } from "@/lib/data";
import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = { title: "Book a session" };

export function generateStaticParams() {
  return sessions.map((s) => ({ id: s.id }));
}

export default async function BookPage({ params }: PageProps<"/book/[id]">) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();
  return <BookingFlow session={session} />;
}
