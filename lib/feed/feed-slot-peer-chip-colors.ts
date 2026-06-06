const CHIP_GRADIENTS = [
  "from-fuchsia-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-indigo-600",
  "from-rose-500 to-orange-600",
] as const;

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function feedSlotPeerChipGradient(peerThreadId: string): string {
  const index = hashKey(peerThreadId) % CHIP_GRADIENTS.length;
  return CHIP_GRADIENTS[index] ?? CHIP_GRADIENTS[0];
}

/** 2–3 char label for compact square chip. */
export function feedSlotPeerChipShortLabel(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return "?";
  }
  if (trimmed.length <= 3) {
    return trimmed;
  }
  return trimmed.slice(0, 2);
}
