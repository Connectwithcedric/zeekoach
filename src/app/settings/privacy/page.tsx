import type { Metadata } from "next";
import { PrivacySettings } from "./privacy-settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <PrivacySettings />;
}
