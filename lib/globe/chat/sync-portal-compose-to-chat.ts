import {
  appendGlobeChatTextMessage,
} from "@/lib/globe/chat/globe-chat-session-store";

/** Sync portal compose turns into the fullscreen chat thread. */
export function syncPortalComposeTurnToChat(input: {
  graphId: string;
  userText: string;
  assistantText: string;
}): void {
  if (input.userText.trim()) {
    appendGlobeChatTextMessage({ graphId: input.graphId, role: "user", text: input.userText });
  }
  if (input.assistantText.trim()) {
    appendGlobeChatTextMessage({
      graphId: input.graphId,
      role: "assistant",
      text: input.assistantText,
    });
  }
}
