"use client";

import { use } from "react";
import { ChatShell } from "@/components/chat/chat-shell";

export default function ChatPage({ params }) {
  const { chatId } = use(params);
  return <ChatShell chatId={chatId} />;
}
