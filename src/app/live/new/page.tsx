import type { Metadata } from "next";
import { GoLive } from "./go-live";

export const metadata: Metadata = { title: "Go live" };

export default function GoLivePage() {
  return <GoLive />;
}
