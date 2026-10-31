import type { Metadata } from "next";
import { NotificationsSettings } from "./notifications-settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <NotificationsSettings />;
}
