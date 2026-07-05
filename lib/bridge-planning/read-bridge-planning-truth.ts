import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  BRIDGE_PLANNING_TRUTH_META_KEY,
  isBridgePlanningTruthV1,
  type BridgePlanningTruthV1,
} from "@/lib/bridge-planning/types";

export function readBridgePlanningTruth(
  event: EventCandidate | null | undefined,
): BridgePlanningTruthV1 | null {
  const raw = event?.metadata?.[BRIDGE_PLANNING_TRUTH_META_KEY];
  return isBridgePlanningTruthV1(raw) ? raw : null;
}

export function isBridgeHostEvent(event: EventCandidate | null | undefined): boolean {
  return event?.metadata?.experienceBridgeHost === true;
}

export function canCommitBridgePlanningTruth(
  event: EventCandidate | null | undefined,
): boolean {
  if (!event?.id?.trim()) {
    return false;
  }
  return isBridgeHostEvent(event);
}
