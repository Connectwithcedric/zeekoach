import type { Metadata } from "next";
import { MyProfile } from "./my-profile";

export const metadata: Metadata = { title: "Your profile" };

export default function MePage() {
  return <MyProfile />;
}
