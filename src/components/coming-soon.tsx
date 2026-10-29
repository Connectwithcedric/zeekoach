import Link from "next/link";
import { Card } from "@/components/ui";

export function ComingSoon({ title }: { title: string }) {
  return (
    <Card className="mx-auto mt-[30px] max-w-[640px] px-8 py-14 text-center">
      <h1 className="text-[19px] font-bold">{title}</h1>
      <p className="mt-2 text-[13px] font-semibold text-muted">This screen is designed in Figma and comes in the next build.</p>
      <Link href="/sessions" className="mt-6 inline-flex h-[38px] items-center rounded-[10px] bg-primary px-6 text-[13px] font-bold text-white">
        Browse sessions
      </Link>
    </Card>
  );
}
