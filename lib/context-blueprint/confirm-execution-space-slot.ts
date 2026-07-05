/**
 * Confirm Execution Space slot after user states choice (e.g. "오사카").
 * Returns NEW ExecutionSpace — L1 Blueprint supersede, never in-place mutation.
 */

import { composeExecutionSpaceSlot } from "@/lib/context-blueprint/execution-space-slots";
import {
  composeExecutionSpace,
  type ExecutionSpace,
} from "@/lib/context-blueprint/spatial-plan";

export function confirmExecutionSpaceDestination(input: {
  base: ExecutionSpace;
  slotId: string;
  candidateId: string;
}): ExecutionSpace {
  const slot = input.base.slots.find((row) => row.slotId === input.slotId);
  if (!slot) {
    throw new Error(`[ExecutionSpace] slot missing: ${input.slotId}`);
  }
  const candidate = slot.candidates.find((row) => row.id === input.candidateId);
  if (!candidate) {
    throw new Error(
      `[ExecutionSpace] candidate missing: ${input.candidateId}`,
    );
  }

  const confirmedSlot = composeExecutionSpaceSlot({
    slotId: slot.slotId,
    role: slot.role,
    label: slot.label,
    resolution: "confirmed",
    selectedCandidateId: candidate.id,
    candidates: slot.candidates,
  });

  const otherSlots = input.base.slots.filter((row) => row.slotId !== slot.slotId);

  const anchors = input.base.anchors.map((anchor) => {
    if (anchor.linkedSlotId !== input.slotId) {
      return anchor;
    }
    if (anchor.kind === "airport" && anchor.id.includes("arrival")) {
      return {
        ...anchor,
        label: `${candidate.label} arrival`,
        lat: candidate.lat ?? anchor.lat ?? null,
        lng: candidate.lng ?? anchor.lng ?? null,
        resolution: "confirmed" as const,
      };
    }
    if (anchor.kind === "hotel_area" || anchor.id.includes("stay")) {
      return {
        ...anchor,
        label: `Stay Area (${candidate.label})`,
        lat: candidate.lat ?? anchor.lat ?? null,
        lng: candidate.lng ?? anchor.lng ?? null,
        resolution: "confirmed" as const,
      };
    }
    return { ...anchor, resolution: "hypothesis" as const };
  });

  return composeExecutionSpace({
    origin: input.base.origin,
    anchors,
    executionZones: input.base.executionZones,
    slots: [...otherSlots, confirmedSlot],
    expectedPathAnchorIds: input.base.expectedPathAnchorIds,
    edges: input.base.edges,
    status: input.base.status,
  });
}

/** User said "오사카" — materialize Japan travel hypothesis into Osaka-confirmed space. */
export function confirmJapanTravelDestinationOsaka(
  base: ExecutionSpace,
): ExecutionSpace {
  return confirmExecutionSpaceDestination({
    base,
    slotId: "destination",
    candidateId: "osaka",
  });
}
