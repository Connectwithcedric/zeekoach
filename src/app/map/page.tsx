import type { Metadata } from "next";
import { MapBoard } from "./map-board";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  return <MapBoard />;
}
