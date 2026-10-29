import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { PostTile } from "@/components/post-tile";
import { ExploreFollowing } from "@/components/tabs-bar";
import { Card, CardHeader, Fab, FollowButton, FollowSuggestions, OutlineButton, PersonRow, Photo, RightRailFooter, ThreeColumns } from "@/components/ui";
import { currentUserId, locations, people, posts } from "@/lib/data";

export default function HomePage() {
  const nearby = people.filter((p) => p.id !== currentUserId && p.role !== "member").slice(0, 7);
  const [a, b, c, big, d, e, live, video, f, g, h] = posts;

  return (
    <>
      <ThreeColumns
        left={
          <>
            <OutlineButton>Upgrade to ProKoach!</OutlineButton>
            <Card className="pb-[15px]">
              <CardHeader title={`${nearby.length + 6} Koaches near by`} />
              <ul className="mt-[13px] space-y-[5px] px-[15px]">
                {nearby.map((p) => (
                  <PersonRow key={p.id} person={p} sub={`${p.distanceKm}km`} />
                ))}
              </ul>
            </Card>
            <Card className="pb-[15px]">
              <div className="px-[25px] pt-[21px]">
                <h2 className="text-[15px] font-bold">Popular Locations</h2>
              </div>
              <ul className="mt-[13px] space-y-[5px] px-[10px]">
                {locations.map((l, i) => (
                  <li key={l.id} className={`flex items-center gap-[15px] rounded-[14px] px-[15px] py-[10px] ${i === 0 ? "bg-bg" : ""}`}>
                    <Photo k="gymInterior" w={40} h={40} className="size-10 rounded-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold">{l.name}</p>
                      <p className="mt-1 text-[11px] font-semibold text-muted">{l.followers} Followers</p>
                    </div>
                    <FollowButton />
                  </li>
                ))}
              </ul>
            </Card>
          </>
        }
        center={
          <>
            <ExploreFollowing />
            <div className="relative">
              <Link
                href="#"
                className="absolute -top-[45px] left-1/2 z-10 flex h-[34px] -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-5 text-[13px] font-bold text-muted shadow-[0_6px_20px_rgba(25,26,30,0.08)]"
              >
                <ArrowUp className="size-4" aria-hidden /> New
              </Link>
              <div className="grid grid-cols-3 gap-[29px] max-sm:gap-2">
                {[a, b, c].map((p) => (
                  <PostTile key={p.id} post={p} w={194} h={194} className="aspect-square" />
                ))}
                <PostTile post={big} w={417} h={417} className="col-span-2 row-span-2 aspect-square" />
                <PostTile post={d} w={194} h={194} className="aspect-square" />
                <PostTile post={e} w={194} h={194} className="aspect-square" />
              </div>
              <div className="mt-[30px] grid grid-cols-2 gap-[30px] max-sm:mt-2 max-sm:gap-2">
                <PostTile post={live} w={305} h={200} className="aspect-[305/200]" />
                <PostTile post={video} w={305} h={200} className="aspect-[305/200]" />
              </div>
              <div className="mt-[30px] grid grid-cols-3 gap-[29px] max-sm:mt-2 max-sm:gap-2">
                {[f, g, h].map((p) => (
                  <PostTile key={p.id} post={p} w={194} h={194} className="aspect-square" />
                ))}
              </div>
            </div>
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
