import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPerson, people } from "@/lib/data";
import { LiveRoom } from "./live-room";

export function generateStaticParams() {
  return people.filter((p) => p.streaming).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/live/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `${getPerson(id)?.name ?? "Live"} is live` };
}

export default async function LivePage({ params }: PageProps<"/live/[id]">) {
  const { id } = await params;
  const host = getPerson(id);
  if (!host?.streaming) notFound();
  return <LiveRoom hostId={host.id} />;
}
