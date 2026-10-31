import type { Metadata } from "next";
import { VerificationSettings } from "./verification-settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <VerificationSettings />;
}
