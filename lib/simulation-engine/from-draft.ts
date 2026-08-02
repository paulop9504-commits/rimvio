/**
 * Draft → Simulation → Impact
 *
 * Simulation never mutates Reality or approves Draft.
 */

import type { RealityDraft } from "@/lib/draft";
import {
  buildRealityStateSlice,
  simulateHotelChange,
} from "@/lib/simulation-engine/simulation";
import type {
  RealityStateSlice,
  SimulationResult,
} from "@/lib/simulation-engine/types";
import { assertSimulationOnly } from "@/lib/simulation-engine/simulation-store";
import { formatHotelChangeSimulationUxKo } from "@/lib/simulation-engine/impact-analyzer";

export type SimulateFromDraftInput = {
  readonly draft: Pick<
    RealityDraft,
    "id" | "workspaceId" | "before" | "after" | "status"
  >;
  readonly current: RealityStateSlice;
  readonly candidate: RealityStateSlice;
  readonly persist?: boolean;
};

/**
 * Flow: Draft (proposed) → Simulation → Impact.
 * Rejects if caller tries to treat this as Reality write.
 */
export function simulateFromDraft(
  input: SimulateFromDraftInput,
): SimulationResult {
  assertSimulationOnly("simulate");

  if (input.draft.status === "approved") {
    // Still predict-only — approved Draft Apply is a separate path
  }

  const result = simulateHotelChange({
    current: input.current,
    candidate: input.candidate,
    workspaceId: input.draft.workspaceId,
    draftId: input.draft.id,
    persist: input.persist,
  });

  return result;
}

export function simulateHotelChangeFromSlices(input: {
  readonly workspaceId?: string | null;
  readonly draftId?: string | null;
  readonly before: {
    readonly objectId: string;
    readonly title: string;
    readonly priceWon: number;
    readonly travelMinutes: number;
    readonly lat?: number;
    readonly lng?: number;
    readonly relatedPlaceIds?: readonly string[];
    readonly scheduleLoadMinutes?: number;
  };
  readonly after: {
    readonly objectId: string;
    readonly title: string;
    readonly priceWon: number;
    readonly travelMinutes: number;
    readonly lat?: number;
    readonly lng?: number;
    readonly relatedPlaceIds?: readonly string[];
    readonly scheduleLoadMinutes?: number;
  };
}): SimulationResult {
  const current = buildRealityStateSlice({
    objectId: input.before.objectId,
    title: input.before.title,
    priceWon: input.before.priceWon,
    priceLabelKo: `${input.before.priceWon.toLocaleString("ko-KR")}원`,
    travelMinutes: input.before.travelMinutes,
    lat: input.before.lat,
    lng: input.before.lng,
    attrs: {
      relatedPlaceIds: input.before.relatedPlaceIds ?? [],
      scheduleLoadMinutes: input.before.scheduleLoadMinutes ?? null,
    },
  });
  const candidate = buildRealityStateSlice({
    objectId: input.after.objectId,
    title: input.after.title,
    priceWon: input.after.priceWon,
    priceLabelKo: `${input.after.priceWon.toLocaleString("ko-KR")}원`,
    travelMinutes: input.after.travelMinutes,
    lat: input.after.lat,
    lng: input.after.lng,
    attrs: {
      relatedPlaceIds: input.after.relatedPlaceIds ?? [],
      scheduleLoadMinutes: input.after.scheduleLoadMinutes ?? null,
    },
  });

  return simulateHotelChange({
    current,
    candidate,
    workspaceId: input.workspaceId,
    draftId: input.draftId,
  });
}

export { formatHotelChangeSimulationUxKo };
