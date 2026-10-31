import type { Metadata } from "next";
import HomePage from "../page";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <HomePage />
      <SignupForm />
    </>
  );
}
