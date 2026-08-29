/**
 * Approval-required capability flows — Prepare → Pending (30m) → Commit.
 */

import type { CapabilityDiscoveryPlan } from "@/lib/platform-sdk/discover-capabilities";
import type { RuntimeRouterResult } from "@/lib/rimvio-core/runtime-router";

export const CAPABILITY_APPROVAL_PENDING_STORAGE_KEY =
  "rimvio.hub.capability-approval-pending.v1";

export const CAPABILITY_APPROVAL_PENDING_TTL_MS = 30 * 60 * 1000;

export type CapabilityApprovalPending = {
  readonly pendingId: string;
  readonly utterance: string;
  readonly plan: CapabilityDiscoveryPlan;
  readonly platformHref: string;
  readonly createdAtIso: string;
  readonly expiresAtIso: string;
  readonly status: "awaiting_user";
};

const PENDING_EVENT = "rimvio:capability-approval-pending";

let memoryPending: CapabilityApprovalPending | null = null;

function emitPendingChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PENDING_EVENT));
  }
}

function readStorage(): CapabilityApprovalPending | null {
  if (memoryPending) return memoryPending;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CAPABILITY_APPROVAL_PENDING_STORAGE_KEY);
    if (!raw) return null;
    const row = JSON.parse(raw) as CapabilityApprovalPending;
    if (new Date(row.expiresAtIso).getTime() <= Date.now()) {
      clearCapabilityApprovalPending();
      return null;
    }
    memoryPending = row;
    return row;
  } catch {
    return null;
  }
}

function persistPending(row: CapabilityApprovalPending | null): void {
  memoryPending = row;
  if (typeof window === "undefined") return;
  try {
    if (row) {
      sessionStorage.setItem(CAPABILITY_APPROVAL_PENDING_STORAGE_KEY, JSON.stringify(row));
    } else {
      sessionStorage.removeItem(CAPABILITY_APPROVAL_PENDING_STORAGE_KEY);
    }
  } catch {
    // ignore quota
  }
  emitPendingChange();
}

export function createCapabilityApprovalPending(input: {
  readonly utterance: string;
  readonly plan: CapabilityDiscoveryPlan;
  readonly platformHref: string;
}): CapabilityApprovalPending {
  const now = Date.now();
  const row: CapabilityApprovalPending = {
    pendingId: `cap-pending-${now}-${Math.random().toString(36).slice(2, 8)}`,
    utterance: input.utterance.trim(),
    plan: input.plan,
    platformHref: input.platformHref,
    createdAtIso: new Date(now).toISOString(),
    expiresAtIso: new Date(now + CAPABILITY_APPROVAL_PENDING_TTL_MS).toISOString(),
    status: "awaiting_user",
  };
  persistPending(row);
  return row;
}

export function readCapabilityApprovalPending(
  pendingId?: string,
): CapabilityApprovalPending | null {
  const row = readStorage();
  if (!row) return null;
  if (pendingId && row.pendingId !== pendingId) return null;
  return row;
}

export function clearCapabilityApprovalPending(): void {
  persistPending(null);
}

export function subscribeCapabilityApprovalPending(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(PENDING_EVENT, handler);
  return () => window.removeEventListener(PENDING_EVENT, handler);
}

/** After user confirms, attach router result and clear pending. */
export function commitCapabilityApprovalPending(input: {
  readonly pendingId: string;
  readonly router: RuntimeRouterResult;
}): CapabilityApprovalPending | null {
  const row = readCapabilityApprovalPending(input.pendingId);
  if (!row) return null;
  clearCapabilityApprovalPending();
  return row;
}

export function clearCapabilityApprovalPendingForTests(): void {
  memoryPending = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CAPABILITY_APPROVAL_PENDING_STORAGE_KEY);
  }
}
