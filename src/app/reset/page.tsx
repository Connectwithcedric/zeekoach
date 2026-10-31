import type { Metadata } from "next";
import HomePage from "../page";
import { Reset } from "./reset";

export const metadata: Metadata = { title: "New password" };

export default function ResetPage() {
  return (
    <>
      <HomePage />
      <Reset />
    </>
  );
}
