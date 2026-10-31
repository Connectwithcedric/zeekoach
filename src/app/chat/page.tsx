import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatRouter } from "./chat-router";

export const metadata: Metadata = { title: "Chat" };

export default function ChatPage() {
  return (
    <Suspense>
      <ChatRouter />
    </Suspense>
  );
}
