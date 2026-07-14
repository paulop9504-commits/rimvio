/** Session hold — Reject parks queue items until cleared (Pending Reality only). */

const EVENT_NAME = "rimvio-reality-queue-hold";

const heldIds = new Set<string>();

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function readRealityQueueHeldItemIds(): ReadonlySet<string> {
  return heldIds;
}

export function isRealityQueueItemHeld(itemId: string): boolean {
  return heldIds.has(itemId.trim());
}

export function holdRealityQueueItems(itemIds: readonly string[]): void {
  for (const id of itemIds) {
    const trimmed = id.trim();
    if (trimmed) {
      heldIds.add(trimmed);
    }
  }
  emit();
}

export function holdAllRealityQueueItems(itemIds: readonly string[]): void {
  holdRealityQueueItems(itemIds);
}

export function clearRealityQueueHolds(): void {
  heldIds.clear();
  emit();
}

export function releaseRealityQueueItem(itemId: string): void {
  heldIds.delete(itemId.trim());
  emit();
}

export function subscribeRealityQueueHold(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
