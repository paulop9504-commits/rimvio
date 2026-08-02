/**
 * Simulation Draft store — Possible Reality only.
 * Forbidden: Reality Commit, Globe stamp, payment.
 */

import type { SimulationDraft } from "@/lib/callout/simulation/types";

const memory = new Map<string, SimulationDraft>();

export const SIMULATION_DRAFT_UPDATED = "rimvio:simulation-draft-updated";

function emit(contextId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SIMULATION_DRAFT_UPDATED, {
      detail: { contextId },
    }),
  );
}

export function readSimulationDraft(
  contextId: string,
): SimulationDraft | null {
  const key = contextId.trim();
  if (!key) return null;
  return memory.get(key) ?? null;
}

export function writeSimulationDraft(draft: SimulationDraft): void {
  const key = draft.contextId.trim();
  if (!key) return;
  memory.set(key, draft);
  emit(key);
}

export function clearSimulationDraft(contextId: string): void {
  const key = contextId.trim();
  if (!key) return;
  memory.delete(key);
  emit(key);
}

/** Guard — Simulation path must never call Commit. */
export function assertSimulationDoesNotCommit(op: string): void {
  if (op === "commit") {
    throw new Error(
      "Simulation Layer cannot Reality Commit — Draft State only",
    );
  }
}
