/**
 * Runtime — Process session (v2). Replaces "Container" in Context OS vocabulary.
 * @see docs/RIMVIO_CANONICAL_VOCABULARY_V2.md
 */

import type { ContextContainerKind } from "@/lib/context-blueprint/blueprint-constants";
import type { BridgeId, ContextId, RuntimeId } from "@/lib/context-os/vocabulary-v2";
import { composeDefaultBridgeId } from "@/lib/context-os/vocabulary-v2";

export const RUNTIME_STATUSES = [
  "active",
  "completed",
  "suspended",
] as const;

export type RuntimeStatus = (typeof RUNTIME_STATUSES)[number];

/** One execution session — mutable state · Blueprint holder. */
export type RimvioRuntime = {
  readonly runtimeId: RuntimeId;
  readonly contextId: ContextId;
  readonly bridgeId: BridgeId;
  readonly runtimeKind: ContextContainerKind;
  readonly status: RuntimeStatus;
  readonly blueprintId: string | null;
  readonly createdAt: string;
};

export type ComposeRuntimeInput = {
  contextId: ContextId;
  bridgeId?: BridgeId;
  runtimeKind: ContextContainerKind;
  runtimeId?: RuntimeId;
  status?: RuntimeStatus;
  blueprintId?: string | null;
  now?: Date;
};

export function composeRuntimeId(
  contextId: ContextId,
  now: Date = new Date(),
): RuntimeId {
  const slug = contextId.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48);
  return `rt-${slug}-${now.getTime()}`;
}

export function composeRuntime(input: ComposeRuntimeInput): RimvioRuntime {
  const now = input.now ?? new Date();
  const contextId = input.contextId.trim();
  if (!contextId) {
    throw new Error("[Runtime] contextId required");
  }
  const bridgeId = input.bridgeId?.trim() || composeDefaultBridgeId(contextId);
  return {
    runtimeId: input.runtimeId ?? composeRuntimeId(contextId, now),
    contextId,
    bridgeId,
    runtimeKind: input.runtimeKind,
    status: input.status ?? "active",
    blueprintId: input.blueprintId ?? null,
    createdAt: now.toISOString(),
  };
}

/** @deprecated v1 Container — use RimvioRuntime from composeRuntime */
export type { ContainerRuntime } from "@/lib/container-runtime/types";

export { assertContextHasNoFlow } from "@/lib/context-os/vocabulary-v2";
