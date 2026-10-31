import type { Metadata } from "next";
import { ClassPage } from "./class-page";

export const metadata: Metadata = { title: "Class" };

export function generateStaticParams() {
  return [{ series: "00000000-0000-0000-0000-000000000000" }];
}

// A class: every date of a repeating session, with likes, follows and comments, like the old app.
export default async function ClassRoute({ params }: PageProps<"/classes/[series]">) {
  const { series } = await params;
  return <ClassPage series={series} />;
}
