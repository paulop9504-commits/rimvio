/**
 * Simulation store — SIMULATION_ONLY artifacts.
 * Forbidden: Reality Commit, Globe stamp, Reality Object mutation.
 */

import type { SimulationResult } from "@/lib/simulation-engine/types";
import { SIMULATION_STATUS } from "@/lib/simulation-engine/types";

const byId = new Map<string, SimulationResult>();
const byWorkspace = new Map<string, string[]>();

export const SIMULATION_UPDATED = "rimvio:reality-simulation-updated";

function emit(workspaceId: string | null): void {
  if (typeof window === "undefined" || !workspaceId) return;
  window.dispatchEvent(
    new CustomEvent(SIMULATION_UPDATED, {
      detail: { workspaceId, status: SIMULATION_STATUS },
    }),
  );
}

/** Absolute gate — Simulation path never mutates Reality. */
export function assertSimulationOnly(op: string): void {
  const forbidden = new Set([
    "commit",
    "reality_commit",
    "globe_commit",
    "stamp_globe",
    "mutate_reality",
    "apply_reality",
    "write_reality",
  ]);
  if (forbidden.has(op)) {
    throw new Error(
      "Simulation Layer is SIMULATION_ONLY — Reality 변경 불가 (predict only)",
    );
  }
}

export function saveSimulation(result: SimulationResult): SimulationResult {
  assertSimulationOnly("save_simulation");
  if (result.status !== SIMULATION_STATUS) {
    throw new Error("SimulationResult.status must be SIMULATION_ONLY");
  }
  byId.set(result.simulationId, result);
  const ws = result.workspaceId?.trim();
  if (ws) {
    const list = byWorkspace.get(ws) ?? [];
    if (!list.includes(result.simulationId)) {
      byWorkspace.set(ws, [...list, result.simulationId]);
    }
    emit(ws);
  }
  return result;
}

export function readSimulation(simulationId: string): SimulationResult | null {
  return byId.get(simulationId.trim()) ?? null;
}

export function listSimulations(
  workspaceId: string,
): readonly SimulationResult[] {
  const ids = byWorkspace.get(workspaceId.trim()) ?? [];
  return ids
    .map((id) => byId.get(id))
    .filter((s): s is SimulationResult => Boolean(s));
}

export function readLatestSimulation(
  workspaceId: string,
): SimulationResult | null {
  const list = listSimulations(workspaceId);
  return list.length > 0 ? list[list.length - 1]! : null;
}

export function clearSimulationsForTests(workspaceId?: string): void {
  if (!workspaceId) {
    byId.clear();
    byWorkspace.clear();
    return;
  }
  const key = workspaceId.trim();
  const ids = byWorkspace.get(key) ?? [];
  for (const id of ids) byId.delete(id);
  byWorkspace.delete(key);
}

/**
 * Attempting to “apply” Simulation as Reality must always fail.
 * Callers that need Draft Apply use workspace-command applyDraftMutation instead.
 */
export function rejectRealityMutationFromSimulation(op: string): never {
  assertSimulationOnly(op);
  throw new Error(
    "Simulation Layer cannot mutate Reality — status remains SIMULATION_ONLY",
  );
}
