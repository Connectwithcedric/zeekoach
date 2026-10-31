import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionForm } from "./session-form";

export const metadata: Metadata = { title: "Create a session" };

export default function NewSessionPage() {
  return (
    <Suspense>
      <SessionForm />
    </Suspense>
  );
}
