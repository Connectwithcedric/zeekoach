import type { Metadata } from "next";
import { Suspense } from "react";
import { GoLive } from "./go-live";

export const metadata: Metadata = { title: "Go live" };

export default function GoLivePage() {
  return (
    <Suspense>
      <GoLive />
    </Suspense>
  );
}
