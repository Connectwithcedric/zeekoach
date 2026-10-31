import type { Metadata } from "next";
import HomePage from "../page";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <HomePage />
      <LoginForm />
    </>
  );
}
