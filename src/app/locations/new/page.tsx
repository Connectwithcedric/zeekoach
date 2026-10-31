import type { Metadata } from "next";
import { MyPlaces } from "./my-places";

export const metadata: Metadata = { title: "List your location" };

export default function ListLocationPage() {
  return <MyPlaces />;
}
