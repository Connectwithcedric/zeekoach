import type { Metadata } from "next";
import { Upgrade } from "./upgrade";

export const metadata: Metadata = { title: "Upgrade to ProKoach" };

export default function UpgradePage() {
  return <Upgrade />;
}
