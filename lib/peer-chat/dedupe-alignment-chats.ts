import type { AlignmentChatListItem } from "@/lib/peer-chat/alignment-chat-types";

/** One list row per DM thread — latest handshake wins. */
export function dedupeAlignmentChatsByThread(
  items: readonly AlignmentChatListItem[],
): AlignmentChatListItem[] {
  const byThread = new Map<string, AlignmentChatListItem>();

  for (const item of items) {
    const threadId = item.threadId.trim();
    if (!threadId) {
      continue;
    }
    const existing = byThread.get(threadId);
    if (!existing) {
      byThread.set(threadId, item);
      continue;
    }
    if (
      new Date(item.updatedAtIso).getTime() >
      new Date(existing.updatedAtIso).getTime()
    ) {
      byThread.set(threadId, item);
    }
  }

  return [...byThread.values()].sort(
    (a, b) =>
      new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime(),
  );
}
