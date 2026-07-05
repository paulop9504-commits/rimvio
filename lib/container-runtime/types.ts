/**
 * Container Runtime — Process session attached to a Bridge (File).
 * Mutable state · workflow · Blueprint holder.
 * Bridge (EventCandidate) never owns ExecutionGraph — only Container does via Blueprint.
 * @see docs/RIMVIO_BRIDGE_VS_CONTAINER.md
 */

import { assertContextHasNoFlow } from "@/lib/context-os/vocabulary-v2";
import type { ContextContainerKind } from "@/lib/context-blueprint/blueprint-constants";

export const CONTAINER_RUNTIME_STATUSES = [
  "active",
  "completed",
  "suspended",
] as const;

export type ContainerRuntimeStatus = (typeof CONTAINER_RUNTIME_STATUSES)[number];

/** Stable memory identity — EventCandidate.id. Bridge never holds ExecutionGraph. */
export type BridgeIdentityRef = {
  readonly bridgeId: string;
};

/**
 * One execution session (Process) for a Bridge (File).
 * Same bridgeId may have many runtimeIds over years.
 */
export type ContainerRuntime = {
  readonly runtimeId: string;
  readonly bridgeId: string;
  readonly containerKind: ContextContainerKind;
  readonly status: ContainerRuntimeStatus;
  readonly blueprintId: string | null;
  readonly createdAt: string;
};

export type ComposeContainerRuntimeInput = {
  bridgeId: string;
  containerKind: ContextContainerKind;
  runtimeId?: string;
  status?: ContainerRuntimeStatus;
  blueprintId?: string | null;
  now?: Date;
};

export function composeContainerRuntimeId(
  bridgeId: string,
  now: Date = new Date(),
): string {
  const slug = bridgeId.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48);
  return `rt-${slug}-${now.getTime()}`;
}

export function composeContainerRuntime(
  input: ComposeContainerRuntimeInput,
): ContainerRuntime {
  const now = input.now ?? new Date();
  const bridgeId = input.bridgeId.trim();
  if (!bridgeId) {
    throw new Error("[ContainerRuntime] bridgeId required");
  }
  return {
    runtimeId: input.runtimeId ?? composeContainerRuntimeId(bridgeId, now),
    bridgeId,
    containerKind: input.containerKind,
    status: input.status ?? "active",
    blueprintId: input.blueprintId ?? null,
    createdAt: now.toISOString(),
  };
}

/** @deprecated v1 — use assertContextHasNoFlow */
export function assertBridgeHasNoExecutionGraph(
  metadata: Record<string, unknown> | null | undefined,
): void {
  assertContextHasNoFlow(metadata);
}
