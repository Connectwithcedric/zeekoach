import type { Metadata } from "next";
import { PlacePage } from "./place-page";

export const metadata: Metadata = { title: "Location" };

export function generateStaticParams() {
  return [{ id: "00000000-0000-0000-0000-000000000000" }];
}

// A listed place, like the old app's location page: classes there, posts tagged there, and a Follow button.
export default async function PlaceRoute({ params }: PageProps<"/places/[id]">) {
  const { id } = await params;
  return <PlacePage id={id} />;
}
