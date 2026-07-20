/**
 * Last Context Pack memory — Cursor “이거도 수정해” continuity for graph turns.
 */

import type { ContextPackV1 } from "@/lib/context-builder/build-context-pack";

const byContext = new Map<string, ContextPackV1>();
const EVENT = "rimvio-context-pack";

export function writeLastContextPack(pack: ContextPackV1): void {
  const id = pack.contextEventId.trim();
  if (!id) {
    return;
  }
  byContext.set(id, pack);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { contextEventId: id } }));
  }
}

export function readLastContextPack(
  contextEventId: string,
): ContextPackV1 | null {
  return byContext.get(contextEventId.trim()) ?? null;
}

export function clearLastContextPack(contextEventId?: string): void {
  if (contextEventId?.trim()) {
    byContext.delete(contextEventId.trim());
    return;
  }
  byContext.clear();
}

/**
 * Resolve “이거 / 그거 / 여기” against last pack selection, lodging Diff, or first node.
 */
export function resolveDeicticFromLastPack(
  contextEventId: string,
  utterance: string,
): { id: string; labelKo: string } | null {
  if (!/(?:이거|그거|여기|이것|해당|방금)/iu.test(utterance)) {
    return null;
  }
  const pack = readLastContextPack(contextEventId);
  if (!pack) {
    return null;
  }
  const selected = pack.nodes.find((n) => n.selected);
  if (selected) {
    return { id: selected.id, labelKo: selected.labelKo };
  }
  const diffId = pack.lodgingDiff?.selectedLodgingId?.trim();
  const diffLabel = pack.lodgingDiff?.selectedLodgingLabelKo?.trim();
  if (diffId && diffLabel) {
    return { id: diffId, labelKo: diffLabel };
  }
  const pinned = pack.nodes.find((n) => n.pinned);
  if (pinned) {
    return { id: pinned.id, labelKo: pinned.labelKo };
  }
  const first = pack.nodes[0];
  return first ? { id: first.id, labelKo: first.labelKo } : null;
}
