"use client";

import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  canCommitBridgePlanningTruth,
  readBridgePlanningTruth,
} from "@/lib/bridge-planning/read-bridge-planning-truth";
import { commitBridgePlanningTruth } from "@/lib/bridge-planning/commit-bridge-planning-truth";

/** Host ingress on bridge-linked context — seed initial planning path (hypothesis). */
export async function seedBridgePlanningTruthFromIngress(input: {
  event: EventCandidate;
  compiled: GlobeIngressCompileResult;
  updatedByUserId: string;
}): Promise<EventCandidate | null> {
  if (!canCommitBridgePlanningTruth(input.event)) {
    return null;
  }
  if (readBridgePlanningTruth(input.event)) {
    return null;
  }

  return commitBridgePlanningTruth({
    event: input.event,
    updatedByUserId: input.updatedByUserId,
    destinationLabel:
      input.compiled.context.slots.find((row) => row.key === "destination")?.value ??
      "여행",
    pathLabels: input.compiled.bridge.pathLabels,
    pinnedLegIndex: 0,
    goalKo: input.compiled.context.goal,
    flowStrokeStyle: "dashed",
  });
}
