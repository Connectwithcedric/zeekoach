import type { Metadata } from "next";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function Page() {
  return <AdminPanel />;
}
