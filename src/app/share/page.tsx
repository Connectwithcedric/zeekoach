import type { Metadata } from "next";
import { ShareBoard } from "./share-board";

export const metadata: Metadata = { title: "Share & Earn" };

export default function SharePage() {
  return <ShareBoard />;
}
