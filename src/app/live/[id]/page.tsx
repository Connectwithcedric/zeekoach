import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPerson, people } from "@/lib/data";
import { LiveRoom } from "./live-room";
import { StreamRoom } from "./stream-room";

const isUuid = (id: string) => /^[0-9a-f-]{36}$/.test(id);

export function generateStaticParams() {
  return people.filter((p) => p.streaming).map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/live/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: isUuid(id) ? "Live" : `${getPerson(id)?.name ?? "Live"} is live` };
}

export default async function LivePage({ params }: PageProps<"/live/[id]">) {
  const { id } = await params;
  if (isUuid(id)) return <StreamRoom id={id} />;
  const host = getPerson(id);
  if (!host?.streaming) notFound();
  return <LiveRoom hostId={host.id} />;
}
