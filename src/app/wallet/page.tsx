import type { Metadata } from "next";
import { WalletBoard } from "./wallet-board";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return <WalletBoard />;
}
