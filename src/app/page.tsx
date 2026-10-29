import { FollowSuggestions, KoachesNearBy } from "@/components/suggestions";
import { PopularLocations } from "@/components/popular-locations";
import { Fab, OutlineButton, RightRailFooter, ThreeColumns } from "@/components/ui";
import { HomeFeed } from "./home-feed";

export default function HomePage() {
  return (
    <>
      <ThreeColumns
        left={
          <>
            <OutlineButton href="/upgrade">Upgrade to ProKoach!</OutlineButton>
            <KoachesNearBy />
            <PopularLocations />
          </>
        }
        center={<HomeFeed />}
        right={
          <>
            <OutlineButton href="/locations/new">List your Location</OutlineButton>
            <FollowSuggestions />
            <RightRailFooter />
          </>
        }
      />
      <Fab href="/post/new" />
    </>
  );
}
