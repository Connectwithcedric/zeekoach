import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Ellipsis, Globe, Pencil, Star } from "lucide-react";
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, TwitterIcon } from "@/components/brand-icons";
import { ClassCard } from "@/components/class-card";
import { ProfileTabs } from "@/components/profile-tabs";
import { Card, Fab, FollowSuggestions, OutlineButton, Photo, RightRailFooter, ThreeColumns } from "@/components/ui";
import { currentUserId, getPerson, people, roleLabel, sessions } from "@/lib/data";

export function generateStaticParams() {
  return people.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/profile/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getPerson(id)?.name ?? "Profile" };
}

const socials = [Globe, LinkedinIcon, InstagramIcon, FacebookIcon, TwitterIcon, TiktokIcon];

export default async function ProfilePage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  const person = getPerson(id);
  if (!person) notFound();
  const isOwner = person.id === currentUserId;
  const theirSessions = sessions.filter((s) => s.koachId === person.id);
  const frame = person.role === "prokoach" ? "bg-yellow" : "bg-primary";

  return (
    <>
      <ThreeColumns
        left={
          <>
            <OutlineButton>Upgrade to ProKoach!</OutlineButton>
            <Card className="relative px-[25px] pb-[25px] pt-[26px]">
              <button aria-label="Profile options" className="absolute right-[25px] top-[14px] text-primary">
                <Ellipsis className="size-5" />
              </button>
              <div className="flex flex-col items-center">
                <div className={`w-[110px] rounded-[16px] p-[3px] ${person.role === "member" ? "" : frame}`}>
                  <Photo k={person.photo} w={104} h={104} className="size-[104px] rounded-[13px]" alt={person.name} />
                  {person.role !== "member" && (
                    <p className="py-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-white">{roleLabel[person.role]}</p>
                  )}
                </div>
                <h1 className="mt-[18px] text-[19px] font-bold">{person.name}</h1>
                {person.reviews > 0 && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[14px] font-bold">
                    <Star className="size-[18px] fill-yellow text-yellow" aria-hidden /> {person.rating} <span className="font-semibold text-muted">({person.reviews})</span>
                  </p>
                )}
              </div>

              <div className="mt-[22px] grid grid-cols-2 gap-[15px]">
                {isOwner ? (
                  <>
                    <Link href="#" className="flex h-[38px] items-center justify-center gap-2 rounded-[10px] bg-bg text-[13px] font-bold text-primary hover:bg-primary-soft">
                      <Pencil className="size-3.5" aria-hidden /> Edit
                    </Link>
                    <Link href="/sessions" className="flex h-[38px] items-center justify-center gap-2 rounded-[10px] bg-bg text-[13px] font-bold text-primary hover:bg-primary-soft">
                      <CalendarClock className="size-3.5" aria-hidden /> Sessions
                    </Link>
                  </>
                ) : (
                  <>
                    <button className="h-[38px] rounded-[10px] bg-primary text-[13px] font-bold text-white hover:bg-primary-strong">Follow</button>
                    <Link href="/chat" className="flex h-[38px] items-center justify-center rounded-[10px] bg-bg text-[13px] font-bold text-primary hover:bg-primary-soft">
                      Message
                    </Link>
                  </>
                )}
              </div>

              <dl className="mt-[20px] grid h-20 grid-cols-3 items-center rounded-[14px] border border-line text-center">
                {[
                  ["Followers", person.followers],
                  ["Following", person.following],
                  ["Subscribers", person.subscribers],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col-reverse">
                    <dt className="mt-1 text-xs font-bold text-primary">{label}</dt>
                    <dd className="text-[22px] font-extrabold">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-[20px] text-[13px] leading-[1.6] text-muted">{person.bio}</p>
              <div className="mt-[20px] flex justify-between">
                {socials.map((Icon, i) => (
                  <a key={i} href="#" className="flex size-[30px] items-center justify-center rounded-[8px] bg-bg text-primary hover:bg-primary-soft" aria-label="Social profile">
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </Card>
          </>
        }
        center={
          <>
            <ProfileTabs />
            {theirSessions.length ? (
              <div className="grid gap-[30px] sm:grid-cols-2">
                {theirSessions.map((s) => (
                  <ClassCard key={s.id} session={s} />
                ))}
              </div>
            ) : (
              <Card className="py-12 text-center">
                <p className="text-[15px] font-bold">No sessions yet</p>
                <p className="mt-1 text-[13px] font-semibold text-muted">
                  {isOwner ? "Add your first session with the + button." : `${person.name.split(" ")[0]} hasn't added any sessions yet.`}
                </p>
              </Card>
            )}
          </>
        }
        right={
          <>
            <OutlineButton>List your Location</OutlineButton>
            <FollowSuggestions />
            <RightRailFooter />
          </>
        }
      />
      <Fab />
    </>
  );
}
