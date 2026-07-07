import {
  dismissOtherResourceOperations,
  transitionResourceOperationStage,
  upsertResourceOperation,
} from "@/lib/resource-operation/resource-operation-store";

export function markLodgingResourceComparing(input: {
  contextEventId: string;
  resourceId: string;
  label: string;
  lat?: number | null;
  lng?: number | null;
}): void {
  upsertResourceOperation({
    contextEventId: input.contextEventId,
    resourceId: input.resourceId,
    domain: "lodging",
    label: input.label,
    stage: "comparing",
    lat: input.lat,
    lng: input.lng,
  });
}

export function markLodgingResourceSelected(input: {
  contextEventId: string;
  resourceId: string;
  label: string;
}): void {
  dismissOtherResourceOperations(input.contextEventId, input.resourceId);
  upsertResourceOperation({
    contextEventId: input.contextEventId,
    resourceId: input.resourceId,
    domain: "lodging",
    label: input.label,
    stage: "selected",
  });
}

export function beginLodgingResourceBooking(resourceId: string): void {
  transitionResourceOperationStage(resourceId, "booking");
}
