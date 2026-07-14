/**
 * Per-Context capability invocation wire — hub timeline rollup SSOT.
 * @see docs/RIMVIO_PROVIDER_NETWORK.md
 */

import type { CapabilityInvocationRecord } from "@/lib/marketplace/marketplace-contract";
import { readProviderMemberId } from "@/lib/marketplace/normalize-provider-member-ref";

export const CONTEXT_CAPABILITY_INVOCATIONS_META_KEY =
  "contextCapabilityInvocationsV1" as const;

export type ContextCapabilityInvocationV1 = {
  readonly id: string;
  readonly capabilityId: string;
  readonly providerId: string;
  readonly providerMemberId: string;
  readonly success: boolean;
  readonly atIso: string;
  readonly invocationId?: string;
};

export type ContextCapabilityInvocationsWireV1 = {
  readonly version: 1;
  readonly invocations: readonly ContextCapabilityInvocationV1[];
};

function asInvocationsWire(
  value: unknown,
): ContextCapabilityInvocationsWireV1 | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ContextCapabilityInvocationsWireV1>;
  if (row.version !== 1 || !Array.isArray(row.invocations)) {
    return null;
  }
  return row as ContextCapabilityInvocationsWireV1;
}

function parseInvocation(raw: unknown): ContextCapabilityInvocationV1 | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Partial<ContextCapabilityInvocationV1>;
  if (
    typeof row.id !== "string" ||
    typeof row.capabilityId !== "string" ||
    typeof row.providerId !== "string" ||
    typeof row.providerMemberId !== "string" ||
    typeof row.success !== "boolean" ||
    typeof row.atIso !== "string"
  ) {
    return null;
  }
  return {
    id: row.id,
    capabilityId: row.capabilityId,
    providerId: row.providerId,
    providerMemberId: row.providerMemberId,
    success: row.success,
    atIso: row.atIso,
    invocationId: typeof row.invocationId === "string" ? row.invocationId : undefined,
  };
}

export function readContextCapabilityInvocationsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): readonly ContextCapabilityInvocationV1[] {
  const wire = asInvocationsWire(metadata?.[CONTEXT_CAPABILITY_INVOCATIONS_META_KEY]);
  if (!wire) {
    return [];
  }
  return wire.invocations
    .map(parseInvocation)
    .filter((row): row is ContextCapabilityInvocationV1 => row != null);
}

export function contextCapabilityInvocationFromRecord(
  record: CapabilityInvocationRecord,
  id: string,
): ContextCapabilityInvocationV1 {
  return {
    id,
    capabilityId: record.capabilityId,
    providerId: record.providerId,
    providerMemberId: readProviderMemberId(record),
    success: record.success,
    atIso: record.timestamp,
    invocationId: record.invocationId,
  };
}

export function appendContextCapabilityInvocationToMetadata(input: {
  metadata?: Record<string, unknown> | null;
  record: CapabilityInvocationRecord;
  now?: Date;
}): Record<string, unknown> {
  const next = { ...(input.metadata ?? {}) };
  const prior = readContextCapabilityInvocationsFromMetadata(next);
  const stamp = input.record.timestamp || (input.now ?? new Date()).toISOString();
  const invocation = contextCapabilityInvocationFromRecord(
    input.record,
    `cap-inv-${stamp}-${prior.length}`,
  );
  const wire: ContextCapabilityInvocationsWireV1 = {
    version: 1,
    invocations: [...prior, invocation],
  };
  next[CONTEXT_CAPABILITY_INVOCATIONS_META_KEY] = wire;
  return next;
}
