import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Challenges" };

export default function ChallengesPage() {
  return <ComingSoon title="Challenges" />;
}
