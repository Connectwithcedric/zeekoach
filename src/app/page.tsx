import { FollowSuggestions, KoachesNearBy } from "@/components/suggestions";
import { FollowToggle } from "@/components/follow-toggle";
import { Card, CardHeader, Fab, OutlineButton, Photo, RightRailFooter, ThreeColumns } from "@/components/ui";
import { locations } from "@/lib/data";
import { HomeFeed } from "./home-feed";

export default function HomePage() {
  return (
    <>
      <ThreeColumns
        left={
          <>
            <OutlineButton>Upgrade to ProKoach!</OutlineButton>
            <KoachesNearBy />
            <Card className="pb-[15px]">
              <CardHeader title="Popular Locations" href="/map" />
              <ul className="mt-[13px] space-y-[5px] px-[10px]">
                {locations.slice(0, 3).map((l, i) => (
                  <li key={l.id} className={`flex items-center gap-[15px] rounded-[14px] px-[15px] py-[10px] ${i === 0 ? "bg-bg" : ""}`}>
                    <Photo k="gymInterior" w={40} h={40} className="size-10 rounded-[10px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold">{l.name}</p>
                      <p className="mt-1 text-[11px] font-semibold text-muted">{l.followers} Followers</p>
                    </div>
                    <FollowToggle personId={l.id} />
                  </li>
                ))}
              </ul>
            </Card>
          </>
        }
        center={<HomeFeed />}
        right={
          <>
            <OutlineButton>List your Location</OutlineButton>
            <FollowSuggestions />
            <RightRailFooter />
          </>
        }
      />
      <Fab href="/post/new" />
    </>
  );
}
