/**
 * Last Action Plan snapshot for Globe Plan card UI + Field handoff.
 */

import type { ActionPlanV1 } from "@/lib/action-planner/types";

const EVENT_NAME = "rimvio-action-plan-ui";

export type ActionPlanUiState = {
  readonly plan: ActionPlanV1;
  readonly waitingCommit: boolean;
  /** One-shot: Globe should open Field queue after NL prepare. */
  readonly requestFieldOpen: boolean;
};

let current: ActionPlanUiState | null = null;

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function writeActionPlanUi(
  plan: ActionPlanV1,
  opts?: {
    readonly waitingCommit?: boolean;
    readonly requestFieldOpen?: boolean;
  },
): void {
  current = {
    plan,
    waitingCommit: Boolean(opts?.waitingCommit),
    requestFieldOpen: Boolean(opts?.requestFieldOpen),
  };
  emit();
}

export function readActionPlanUi(): ActionPlanV1 | null {
  return current?.plan ?? null;
}

export function readActionPlanUiState(): ActionPlanUiState | null {
  return current;
}

/** Clear one-shot Field open flag after Globe handles it. */
export function consumeActionPlanFieldOpenRequest(): boolean {
  if (!current?.requestFieldOpen) {
    return false;
  }
  current = {
    ...current,
    requestFieldOpen: false,
  };
  return true;
}

export function clearActionPlanUi(): void {
  current = null;
  emit();
}

export function subscribeActionPlanUi(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
