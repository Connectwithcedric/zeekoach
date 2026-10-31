import type { Metadata } from "next";
import { PreferencesSettings } from "./preferences-settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <PreferencesSettings />;
}
