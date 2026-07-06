import type {
  LocalDiscoveryActionSpec,
  LocalDiscoveryPendingAnswers,
  LocalDiscoveryQuestion,
} from "@/lib/globe/context-condition-ai/local-discovery-action-types";

export type ContextConditionPendingWire = {
  readonly triggerMessage: string;
  readonly questions: readonly LocalDiscoveryQuestion[];
  readonly answers: LocalDiscoveryPendingAnswers;
  readonly spec: LocalDiscoveryActionSpec | null;
  readonly updatedAtIso: string;
};

const STORAGE_PREFIX = "rimvio-context-condition-pending";

function storageKey(contextEventId: string): string {
  return `${STORAGE_PREFIX}:${contextEventId.trim()}`;
}

export function readContextConditionPending(
  contextEventId: string,
): ContextConditionPendingWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(storageKey(contextEventId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ContextConditionPendingWire;
  } catch {
    return null;
  }
}

export function writeContextConditionPending(
  contextEventId: string,
  wire: ContextConditionPendingWire,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(storageKey(contextEventId), JSON.stringify(wire));
  } catch {
    /* ignore */
  }
}

export function clearContextConditionPending(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(storageKey(contextEventId));
  } catch {
    /* ignore */
  }
}
