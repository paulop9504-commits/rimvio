/**
 * What-if Simulation Engine
 *
 * Current Reality
 *       ↓
 * Simulation Layer  (compute only)
 *       ↓
 * Possible Reality  (Draft — never Commit)
 */

import { estimateWalkMinutes } from "@/lib/context-workspace/reality-draft/refine-trip-draft-stops";
import {
  formatMinutesDelta,
  formatWonDelta,
  parseWonAmount,
} from "@/lib/callout/simulation/parse-amount";
import type {
  CurrentRealitySnapshot,
  SimulationChange,
  SimulationDraft,
  SimulationImpact,
  SimulationItineraryAnchor,
  SimulationProposal,
  SimulationResult,
  SimulationScenarioKind,
} from "@/lib/callout/simulation/types";

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function pickDayAnchor(
  current: CurrentRealitySnapshot,
  anchors: readonly SimulationItineraryAnchor[],
): SimulationItineraryAnchor | null {
  if (anchors.length === 0) return null;
  if (current.dayLabelKo) {
    const hit = anchors.find(
      (a) =>
        a.labelKo === current.dayLabelKo ||
        current.dayLabelKo!.includes(`Day ${a.day}`) ||
        current.dayLabelKo!.includes(`${a.day}일`),
    );
    if (hit) return hit;
  }
  // Nearest itinerary stop as day gravity
  let best: SimulationItineraryAnchor | null = null;
  let bestM = Number.POSITIVE_INFINITY;
  for (const a of anchors) {
    if (a.nodeId === current.objectId) continue;
    const m = haversineMeters(current, a);
    if (m < bestM) {
      bestM = m;
      best = a;
    }
  }
  return best ?? anchors[0] ?? null;
}

function buildBudgetChange(
  current: CurrentRealitySnapshot,
  proposal: SimulationProposal,
): SimulationChange | null {
  const cur =
    current.priceWon ?? parseWonAmount(current.priceLabelKo);
  const next =
    proposal.priceWon ?? parseWonAmount(proposal.priceLabelKo);
  if (cur == null || next == null) return null;
  const delta = next - cur;
  return {
    id: "budget",
    kind: "budget",
    labelKo: "가격",
    valueKo: formatWonDelta(delta),
    delta,
  };
}

function buildDistanceChange(
  current: CurrentRealitySnapshot,
  proposal: SimulationProposal,
): SimulationChange | null {
  const meters = Math.round(haversineMeters(current, proposal));
  if (!Number.isFinite(meters) || meters < 40) return null;
  const minutes = Math.max(1, Math.round(meters / 80));
  return {
    id: "distance",
    kind: "distance",
    labelKo: "거리",
    valueKo: formatMinutesDelta(minutes),
    delta: minutes,
  };
}

function buildScheduleChange(
  current: CurrentRealitySnapshot,
  proposal: SimulationProposal,
  anchors: readonly SimulationItineraryAnchor[],
): SimulationChange | null {
  const anchor = pickDayAnchor(current, anchors);
  if (!anchor) return null;

  const before = estimateWalkMinutes(
    current.lat,
    current.lng,
    anchor.lat,
    anchor.lng,
  );
  const after = estimateWalkMinutes(
    proposal.lat,
    proposal.lng,
    anchor.lat,
    anchor.lng,
  );
  const delta = after - before;
  if (delta === 0) return null;

  const dayLabel = anchor.labelKo || `Day${anchor.day}`;
  return {
    id: "schedule",
    kind: "schedule",
    labelKo: "일정 영향",
    valueKo: `${dayLabel} 이동시간 ${formatMinutesDelta(delta)}`,
    delta,
  };
}

function summarizeImpact(
  changes: readonly SimulationChange[],
): SimulationImpact {
  let budget = 0;
  let time = 0;
  let distance = 0;
  for (const c of changes) {
    if (c.kind === "budget") budget += c.delta;
    else if (c.kind === "schedule" || c.kind === "time") time += c.delta;
    else if (c.kind === "distance") distance += c.delta;
  }
  return { budget, time, distance };
}

/**
 * Pure What-if: Current Reality + proposal → SimulationResult.
 * Does not mutate Workspace / Reality.
 */
export function runWhatIfSimulation(input: {
  scenarioKind?: SimulationScenarioKind;
  current: CurrentRealitySnapshot;
  proposal: SimulationProposal;
  anchors?: readonly SimulationItineraryAnchor[];
}): SimulationResult {
  const { current, proposal, anchors = [] } = input;
  const changes: SimulationChange[] = [
    {
      id: "object",
      kind: "object",
      labelKo:
        input.scenarioKind === "change_hotel" ||
        current.typeLabelKo.includes("숙소")
          ? "Change Hotel"
          : "Change Object",
      valueKo: `${current.title} → ${proposal.title}`,
      delta: 0,
    },
  ];

  const budget = buildBudgetChange(current, proposal);
  if (budget) changes.push(budget);

  const distance = buildDistanceChange(current, proposal);
  if (distance) changes.push(distance);

  const schedule = buildScheduleChange(current, proposal, anchors);
  if (schedule) changes.push(schedule);

  return {
    changes,
    impact: summarizeImpact(changes),
  };
}

/** Open a Simulation Draft (Possible Reality) — preview only. */
export function createSimulationDraft(input: {
  contextId: string;
  scenarioKind?: SimulationScenarioKind;
  current: CurrentRealitySnapshot;
  proposal: SimulationProposal;
  anchors?: readonly SimulationItineraryAnchor[];
}): SimulationDraft {
  const scenarioKind = input.scenarioKind ?? "change_object";
  const result = runWhatIfSimulation({
    scenarioKind,
    current: input.current,
    proposal: input.proposal,
    anchors: input.anchors,
  });
  return {
    simulationId: `sim_${Date.now().toString(36)}_${input.proposal.objectId}`,
    contextId: input.contextId,
    scenarioKind,
    status: "preview",
    current: input.current,
    proposal: input.proposal,
    result,
    createdAtIso: new Date().toISOString(),
    appliedAtIso: null,
  };
}

/**
 * Mark draft as applied_to_draft — still NOT Reality Commit.
 * Caller may soft-select the proposal in Workspace Draft State.
 */
export function markSimulationDraftApplied(
  draft: SimulationDraft,
): SimulationDraft {
  return {
    ...draft,
    status: "applied_to_draft",
    appliedAtIso: new Date().toISOString(),
  };
}

export function simulationImpactLinesKo(
  result: SimulationResult,
): readonly string[] {
  const lines: string[] = [];
  for (const c of result.changes) {
    if (c.kind === "object") continue;
    lines.push(`${c.labelKo}: ${c.valueKo}`);
  }
  if (lines.length === 0) {
    lines.push("유의미한 수치 변화는 아직 없어요");
  }
  return lines;
}
