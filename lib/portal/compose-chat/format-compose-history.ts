import type { ComposeIntentMessage } from "@/lib/portal/compose-intent/intent-state-types";
import type { ComposeMessage } from "@/lib/portal/compose-draft/types";

export function formatComposeHistoryForLlm(
  history: readonly ComposeIntentMessage[] | readonly ComposeMessage[],
  newMessage?: string,
): string {
  const lines = history.map((message) => `${message.role}: ${message.text}`);
  if (newMessage?.trim()) {
    const last = history[history.length - 1];
    if (!(last?.role === "user" && last.text.trim() === newMessage.trim())) {
      lines.push(`user: ${newMessage.trim()}`);
    }
  }
  return lines.join("\n");
}
