import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Star } from "lucide-react";
import { Avatar, RoleBadge } from "@/components/avatar";
import { Card } from "@/components/card";
import { RightRail } from "@/components/right-rail";
import { SessionCard } from "@/components/session-card";
import { currentUserId, getPerson, people, sessions } from "@/lib/data";

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
  if (!person) notFound();
  const isMe = person.id === currentUserId;
  const theirSessions = sessions.filter((s) => s.koachId === person.id);

  const stats = [
    { label: "Followers", value: person.followers },
    { label: "Following", value: person.following },
    { label: "Subscribers", value: person.subscribers, hint: "Members who pay monthly for this Koach's content" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_300px]">
      <Card className="h-fit text-center">
        <Avatar person={person} size="lg" />
        <h1 className="mt-4 text-xl font-bold">{person.name}</h1>
        <div className="mt-1 flex items-center justify-center gap-2 text-sm">
          <RoleBadge person={person} />
          <span className="flex items-center gap-1">
            <Star className="size-4 fill-accent text-accent" aria-hidden /> {person.rating.toFixed(2)} ({person.reviews})
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{person.city}</p>
        {isMe ? (
          <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-surface-muted py-2.5 text-sm font-semibold text-primary">
            <Pencil className="size-4" aria-hidden /> Edit profile
          </button>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-white">Follow</button>
            <button className="rounded-xl bg-surface-muted py-2.5 text-sm font-semibold text-primary">Message</button>
          </div>
        )}
        <dl className="mt-5 grid grid-cols-3 rounded-xl border border-line py-3">
          {stats.map((s) => (
            <div key={s.label} title={s.hint}>
              <dd className="text-lg font-bold">{s.value.toLocaleString("en")}</dd>
              <dt className="text-xs font-semibold text-primary">{s.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-left text-sm leading-relaxed text-muted">{person.bio}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {person.sports.map((s) => (
            <span key={s} className="rounded-md bg-surface-muted px-2 py-1 text-xs font-semibold">
              {s}
            </span>
          ))}
        </div>
      </Card>

      <section>
        <h2 className="mb-4 text-lg font-bold">{isMe ? "Your sessions" : "Sessions"}</h2>
        {theirSessions.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {theirSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        ) : (
          <Card className="text-center text-sm text-muted">No upcoming sessions yet.</Card>
        )}
      </section>

      <div className="hidden xl:block">
        <RightRail />
      </div>
    </div>
  );
}
