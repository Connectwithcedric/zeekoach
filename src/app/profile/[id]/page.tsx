import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUserId, getPerson, people, sessions } from "@/lib/data";
import { LiveProfile } from "./live-profile";
import { ProfileView } from "./profile-view";

export function generateStaticParams() {
  return people.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/profile/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getPerson(id)?.name ?? "Profile" };
}

export default async function ProfilePage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  const person = getPerson(id);
  if (person) return <ProfileView person={person} theirSessions={sessions.filter((s) => s.koachId === person.id)} isOwner={person.id === currentUserId} />;
  // Real accounts live in the database and load in the browser.
  if (/^[0-9a-f-]{36}$/.test(id)) return <LiveProfile id={id} />;
  notFound();
}
