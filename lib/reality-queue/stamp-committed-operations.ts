/**
 * Stamp prepared Operations into Event metadata on Reality Commit.
 * Execution is disposable after commit — durable truth is the stamp + event.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const REALITY_COMMITTED_OPS_META_KEY = "realityCommittedOpsV1" as const;

export type RealityCommittedOpStampV1 = {
  readonly operationId: string;
  readonly kind: string;
  readonly labelKo: string;
  readonly placeId: string | null;
  readonly amountLabel: string | null;
  readonly committedAtIso: string;
  readonly engineId: string | null;
};

export type RealityCommittedOpsBundleV1 = {
  readonly version: 1;
  readonly ops: readonly RealityCommittedOpStampV1[];
};

function readBundle(metadata: EventCandidate["metadata"]): RealityCommittedOpsBundleV1 {
  const raw = metadata?.[REALITY_COMMITTED_OPS_META_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { version: 1, ops: [] };
  }
  const row = raw as { version?: unknown; ops?: unknown };
  if (row.version !== 1 || !Array.isArray(row.ops)) {
    return { version: 1, ops: [] };
  }
  return {
    version: 1,
    ops: row.ops.filter(
      (op): op is RealityCommittedOpStampV1 =>
        Boolean(op) &&
        typeof op === "object" &&
        typeof (op as RealityCommittedOpStampV1).operationId === "string",
    ),
  };
}

export function stampCommittedOperationsOnEvent(input: {
  event: EventCandidate;
  operations: readonly RealityOperationV1[];
  nowIso?: string;
}): EventCandidate {
  const now = input.nowIso ?? new Date().toISOString();
  const prior = readBundle(input.event.metadata);
  const nextOps: RealityCommittedOpStampV1[] = [
    ...prior.ops,
    ...input.operations.map((op) => ({
      operationId: op.operationId,
      kind: op.kind,
      labelKo: op.labelKo,
      placeId: op.sourceRef?.trim() || null,
      amountLabel: op.amountLabel ?? op.preview.amountLabel ?? null,
      committedAtIso: now,
      engineId: op.engineId ?? null,
    })),
  ];
  // Dedupe by operationId — last write wins
  const byId = new Map<string, RealityCommittedOpStampV1>();
  for (const op of nextOps) {
    byId.set(op.operationId, op);
  }

  return commitEventUpsert({
    ...input.event,
    metadata: {
      ...(input.event.metadata ?? {}),
      [REALITY_COMMITTED_OPS_META_KEY]: {
        version: 1,
        ops: [...byId.values()],
      } satisfies RealityCommittedOpsBundleV1,
    },
    updatedAt: now,
  });
}

export function readCommittedOperationsFromEvent(
  event: EventCandidate,
): readonly RealityCommittedOpStampV1[] {
  return readBundle(event.metadata).ops;
}
