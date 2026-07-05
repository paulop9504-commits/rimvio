/**
 * Rimvio Context OS — Canonical Vocabulary v2 wire types.
 * 1 object = 1 responsibility. See docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 */

import type { EventCandidate } from "@/lib/events/event-candidate";

/** Raw input — no meaning until ingested. */
export const CAPTURE_KINDS = ["photo", "gps", "video", "text", "link", "share"] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

/**
 * Context — SSOT meaning unit (Globe node).
 * Engineering row: EventCandidate until schema rename.
 */
export type ContextRecord = EventCandidate;

export type ContextId = string;

/** Bridge — memory graph identity linking Contexts (File). Not execution. */
export type BridgeId = string;

/** Runtime — active Process session. Mutable state. */
export type RuntimeId = string;

export type ContextRef = {
  readonly contextId: ContextId;
};

export type BridgeRef = {
  readonly bridgeId: BridgeId;
};

export type RuntimeRef = {
  readonly runtimeId: RuntimeId;
};

/** v2 ID bundle on Blueprint / Runtime spawn. */
export type ContextOsIdentityBundle = {
  readonly contextId: ContextId;
  readonly bridgeId: BridgeId;
  readonly runtimeId: RuntimeId;
};

/** Map legacy EventCandidate row to v2 Context id. */
export function readContextIdFromRecord(record: ContextRecord): ContextId {
  return record.id;
}

/** MVP: single-context bridge roots at primary context until multi-context graph ships. */
export function composeDefaultBridgeId(contextId: ContextId): BridgeId {
  const id = contextId.trim();
  return id.startsWith("bridge-") ? id : `bridge-${id}`;
}

/** PR gate — Context (meaning SSOT) must not hold Flow/Blueprint. */
export function assertContextHasNoFlow(
  metadata: Record<string, unknown> | null | undefined,
): void {
  if (!metadata) {
    return;
  }
  const forbidden = [
    "executionGraph",
    "execution_graph",
    "flow",
    "flowGraph",
    "contextBlueprint",
    "blueprint",
  ];
  for (const key of forbidden) {
    if (key in metadata && metadata[key] != null) {
      throw new Error(`[Context] forbidden runtime field on Context metadata: ${key}`);
    }
  }
}
