import type { Metadata } from "next";
import { ChatBoard } from "./chat-board";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return <ChatBoard />;
}
