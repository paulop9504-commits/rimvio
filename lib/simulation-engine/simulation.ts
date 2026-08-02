/**
 * Reality Simulation Engine
 *
 * Draft → Simulation → Impact
 *
 * Reality와 분리 — 미래 상태만 계산. Reality 변경 불가 (SIMULATION_ONLY).
 */

import { analyzeSimulationImpact } from "@/lib/simulation-engine/impact-analyzer";
import {
  assertSimulationOnly,
  saveSimulation,
} from "@/lib/simulation-engine/simulation-store";
import type {
  PossibleChange,
  RealityStateSlice,
  SimulationResult,
} from "@/lib/simulation-engine/types";
import { SIMULATION_STATUS } from "@/lib/simulation-engine/types";

function newSimulationId(targetId: string): string {
  return `sim_${Date.now().toString(36)}_${targetId.slice(0, 12)}`;
}

/**
 * Run Simulation: Current Reality + Possible Change → before/after/impact.
 * Always returns status SIMULATION_ONLY. Never mutates Reality.
 */
export function runRealitySimulation(input: {
  readonly current: RealityStateSlice;
  readonly change: PossibleChange;
  readonly workspaceId?: string | null;
  readonly draftId?: string | null;
  /** Persist to simulation-store (default true) */
  readonly persist?: boolean;
}): SimulationResult {
  assertSimulationOnly("simulate");

  const before = input.current;
  const after = input.change.target;
  const impact = analyzeSimulationImpact(before, after);

  const result: SimulationResult = {
    before,
    after,
    impact,
    status: SIMULATION_STATUS,
    simulationId: newSimulationId(after.objectId || "x"),
    change: input.change,
    workspaceId: input.workspaceId?.trim() || null,
    draftId: input.draftId?.trim() || null,
    createdAtIso: new Date().toISOString(),
  };

  if (input.persist !== false) {
    saveSimulation(result);
  }

  return result;
}

/**
 * Convenience: simulate Hotel A → Hotel B style replace.
 */
export function simulateHotelChange(input: {
  readonly current: RealityStateSlice;
  readonly candidate: RealityStateSlice;
  readonly workspaceId?: string | null;
  readonly draftId?: string | null;
  readonly persist?: boolean;
}): SimulationResult {
  return runRealitySimulation({
    current: input.current,
    change: {
      kind: "replace_hotel",
      target: { ...input.candidate, kind: input.candidate.kind || "hotel" },
      labelKo: `${input.current.title} → ${input.candidate.title}`,
    },
    workspaceId: input.workspaceId,
    draftId: input.draftId,
    persist: input.persist,
  });
}

/**
 * Multi-object reasoning: hotel move → ripple (route · food · USJ · airport).
 * SIMULATION_ONLY — does not mutate Reality Graph.
 */
export function simulateHotelMoveWithRipple(input: {
  readonly current: RealityStateSlice;
  readonly destination: RealityStateSlice;
  readonly workspaceId?: string | null;
  readonly draftId?: string | null;
  readonly persist?: boolean;
}): SimulationResult {
  return runRealitySimulation({
    current: input.current,
    change: {
      kind: "move_hotel",
      target: {
        ...input.destination,
        kind: input.destination.kind || "hotel",
      },
      labelKo: `Hotel Move · ${input.current.title} → ${input.destination.title}`,
    },
    workspaceId: input.workspaceId,
    draftId: input.draftId,
    persist: input.persist,
  });
}

/** Build a RealityStateSlice from loose hotel fields. */
export function buildRealityStateSlice(input: {
  readonly objectId: string;
  readonly title: string;
  readonly kind?: string;
  readonly priceWon?: number | null;
  readonly priceLabelKo?: string | null;
  readonly rating?: number | null;
  readonly travelMinutes?: number | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly attrs?: Readonly<Record<string, unknown>>;
}): RealityStateSlice {
  return {
    objectId: input.objectId,
    title: input.title,
    kind: input.kind ?? "hotel",
    priceWon: input.priceWon ?? null,
    priceLabelKo: input.priceLabelKo ?? null,
    rating: input.rating ?? null,
    travelMinutes: input.travelMinutes ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    attrs: input.attrs,
  };
}
