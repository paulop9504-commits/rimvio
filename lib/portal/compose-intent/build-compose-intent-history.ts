import { readGlobeChatMessages } from "@/lib/globe/chat/globe-chat-session-store";
import type { ComposeIntentMessage } from "@/lib/portal/compose-intent/intent-state-types";

export function buildComposeIntentHistory(input: {
  graphId: string;
  accumulatedText: string;
  newMessage: string;
}): ComposeIntentMessage[] {
  const fromChat = readGlobeChatMessages(input.graphId)
    .filter((message) => message.kind === "text")
    .map((message) => ({
      role: message.role,
      text: message.kind === "text" ? message.text : "",
    }));

  if (fromChat.length > 0) {
    const last = fromChat[fromChat.length - 1];
    if (last?.role === "user" && last.text.trim() === input.newMessage.trim()) {
      return fromChat;
    }
    return [...fromChat, { role: "user" as const, text: input.newMessage.trim() }];
  }

  const lines = input.accumulatedText
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const messages: ComposeIntentMessage[] = lines.map((line) => ({
    role: "user",
    text: line,
  }));
  if (!messages.some((m) => m.text === input.newMessage.trim())) {
    messages.push({ role: "user", text: input.newMessage.trim() });
  }
  return messages;
}
