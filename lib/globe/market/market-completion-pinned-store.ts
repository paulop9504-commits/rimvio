export const MARKET_COMPLETION_META_KEY = "marketCompletion" as const;

const PINNED_KEY = "rimvio-market-completion-pinned.v1";

function readPinnedSet(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function writePinnedSet(ids: Set<string>): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(PINNED_KEY, JSON.stringify([...ids]));
}

export function isMarketCompletionTracePinned(handshakeId: string): boolean {
  return readPinnedSet().has(handshakeId.trim());
}

export function markMarketCompletionTracePinned(handshakeId: string): void {
  const ids = readPinnedSet();
  ids.add(handshakeId.trim());
  writePinnedSet(ids);
}

export function dismissMarketCompletionTrace(handshakeId: string): void {
  markMarketCompletionTracePinned(handshakeId);
}
