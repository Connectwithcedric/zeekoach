import type { Metadata } from "next";
import HomePage from "../page";
import { Forgot } from "./forgot";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPage() {
  return (
    <>
      <HomePage />
      <Forgot />
    </>
  );
}
