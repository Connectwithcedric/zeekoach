import type { Metadata } from "next";
import HomePage from "../page";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Set up your profile" };

export default function OnboardingPage() {
  return (
    <>
      <HomePage />
      <Onboarding />
    </>
  );
}
