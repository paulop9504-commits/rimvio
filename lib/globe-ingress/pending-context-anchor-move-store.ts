/**
 * Pending Context Anchor move — confirm before commit.
 */

export type PendingContextAnchorMove = {
  readonly graphId: string;
  readonly eventId: string;
  readonly fromLabel: string;
  readonly toLabel: string;
  readonly toLat: number;
  readonly toLng: number;
  readonly utterance: string;
  readonly createdAtIso: string;
};

const BY_GRAPH = new Map<string, PendingContextAnchorMove>();

export function writePendingContextAnchorMove(
  pending: PendingContextAnchorMove,
): void {
  const id = pending.graphId.trim();
  if (!id) {
    return;
  }
  BY_GRAPH.set(id, pending);
}

export function readPendingContextAnchorMove(
  graphId: string | null | undefined,
): PendingContextAnchorMove | null {
  const id = graphId?.trim();
  if (!id) {
    return null;
  }
  return BY_GRAPH.get(id) ?? null;
}

export function clearPendingContextAnchorMove(
  graphId: string | null | undefined,
): void {
  const id = graphId?.trim();
  if (!id) {
    return;
  }
  BY_GRAPH.delete(id);
}

export function resetPendingContextAnchorMoveForTests(): void {
  BY_GRAPH.clear();
}
