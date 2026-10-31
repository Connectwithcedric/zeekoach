import type { Metadata } from "next";
import { EmergencySettings } from "./emergency-settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <EmergencySettings />;
}
