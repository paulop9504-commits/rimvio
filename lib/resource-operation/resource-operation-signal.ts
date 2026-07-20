import { copy } from "@/lib/copy/human-ko";
import type {
  ResourceOperation,
  ResourceOperationSignalTone,
  ResourceOperationStage,
} from "@/lib/resource-operation/types";

export type ResourceOperationSignal = {
  label: string;
  tone: ResourceOperationSignalTone;
  pulse: boolean;
};

const STAGE_ORDER: Record<ResourceOperationStage, number> = {
  searching: 1,
  comparing: 2,
  selected: 3,
  booking: 4,
  awaiting_pay: 5,
  committed: 6,
  failed: 0,
  dismissed: -1,
};

export function shouldShowResourceOperationSignal(
  stage: ResourceOperationStage,
): boolean {
  return stage !== "dismissed" && stage !== "committed";
}

/**
 * Map pins — only action-critical stages.
 * searching/comparing belong in Field/queue, not left-chrome clutter.
 */
export function shouldShowResourceOperationSignalOnMap(
  stage: ResourceOperationStage,
): boolean {
  return (
    stage === "selected" ||
    stage === "booking" ||
    stage === "awaiting_pay" ||
    stage === "failed"
  );
}

export function resolveResourceOperationSignal(
  operation: ResourceOperation | null | undefined,
): ResourceOperationSignal | null {
  if (!operation || !shouldShowResourceOperationSignal(operation.stage)) {
    return null;
  }
  switch (operation.stage) {
    case "searching":
      return {
        label: copy.globe.resourceOperationSignalSearching,
        tone: "amber",
        pulse: true,
      };
    case "comparing":
      return {
        label: copy.globe.resourceOperationSignalComparing,
        tone: "amber",
        pulse: false,
      };
    case "selected":
      return {
        label: copy.globe.resourceOperationSignalSelected,
        tone: "blue",
        pulse: false,
      };
    case "booking":
      return {
        label: copy.globe.resourceOperationSignalBooking,
        tone: "blue",
        pulse: true,
      };
    case "awaiting_pay":
      return {
        label: copy.globe.resourceOperationSignalAwaitingPay,
        tone: "amber",
        pulse: true,
      };
    case "failed":
      return {
        label: copy.globe.resourceOperationSignalFailed,
        tone: "red",
        pulse: false,
      };
    default:
      return null;
  }
}

export function compareResourceOperationStage(
  left: ResourceOperationStage,
  right: ResourceOperationStage,
): number {
  return STAGE_ORDER[left] - STAGE_ORDER[right];
}

/** Never downgrade an in-flight booking when discovery re-reveals pins. */
export function mergeResourceOperationStage(
  current: ResourceOperationStage | null | undefined,
  incoming: ResourceOperationStage,
): ResourceOperationStage {
  if (!current) {
    return incoming;
  }
  if (current === "dismissed" || current === "committed" || current === "failed") {
    return current;
  }
  if (compareResourceOperationStage(incoming, current) >= 0) {
    return incoming;
  }
  return current;
}
