import type { Metadata } from "next";
import { Forgot } from "./forgot";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return <Forgot />;
}
