import { readPinnedRoster } from "@/lib/context/peer-thread-settings-store";

export type PeerMentionSuggestion = {
  peerThreadId: string;
  displayName: string;
  label: string;
};

/** Read-only — for @ autocomplete chips. */
export function suggestPeerMentions(query: string): PeerMentionSuggestion[] {
  const roster = readPinnedRoster();
  const q = query.trim().toLowerCase();
  return roster.slots.flatMap((s) => {
    if (s.connection !== "connected") {
      return [];
    }
    const peerThreadId = s.peerThreadId?.trim();
    const displayName = s.displayName?.trim();
    if (!peerThreadId || !displayName) {
      return [];
    }
    if (q && !displayName.toLowerCase().includes(q)) {
      return [];
    }
    return [{ peerThreadId, displayName, label: `@${displayName}` }];
  });
}

export function activePeerMentionQuery(text: string): string | null {
  const at = text.lastIndexOf("@");
  if (at < 0) {
    return null;
  }
  const tail = text.slice(at + 1);
  if (/\s/.test(tail)) {
    return null;
  }
  return tail;
}
