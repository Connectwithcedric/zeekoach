import type { Metadata } from "next";
import { SessionList } from "./session-list";

export const metadata: Metadata = { title: "Sessions" };

export default function SessionsPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Sessions</h1>
      <p className="mb-5 text-sm text-muted">Filter by sport, format and price.</p>
      <SessionList />
    </div>
  );
}
