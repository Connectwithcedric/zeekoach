import type { Metadata } from "next";
import { Suspense } from "react";
import { SendGift } from "./send-gift";

export const metadata: Metadata = { title: "Send a gift card" };

export default function GiftPage() {
  return (
    <Suspense>
      <SendGift />
    </Suspense>
  );
}
