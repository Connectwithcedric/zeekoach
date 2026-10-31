import type { Metadata } from "next";
import { Go } from "./go";

export const metadata: Metadata = { title: "Join zKoach" };

export function generateStaticParams() {
  return [{ code: "zeekoach" }];
}

// Referral links: zeekoach.vercel.app/r/<username>
export default async function ReferralPage({ params }: PageProps<"/r/[code]">) {
  const { code } = await params;
  return <Go code={code} />;
}
