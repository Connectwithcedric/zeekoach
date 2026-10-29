import type { Metadata } from "next";
import { Card } from "@/components/card";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <h1 className="text-xl font-bold">Wallet</h1>
      <p className="mt-2 text-sm text-muted">This part of ZeeKOACH is designed in Figma and comes in a later build.</p>
    </Card>
  );
}
