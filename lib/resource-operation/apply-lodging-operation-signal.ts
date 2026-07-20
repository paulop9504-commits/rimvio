import {
  resolveResourceOperationSignal,
  shouldShowResourceOperationSignalOnMap,
} from "@/lib/resource-operation/resource-operation-signal";
import { readResourceOperation } from "@/lib/resource-operation/resource-operation-store";
import type { GlobeLodgingMapMarker } from "@/lib/globe/context-hub/lodging-globe-marker-types";

export function applyLodgingOperationSignal(
  marker: GlobeLodgingMapMarker,
): GlobeLodgingMapMarker {
  const operation = readResourceOperation(marker.resourceId);
  const signal =
    operation && shouldShowResourceOperationSignalOnMap(operation.stage)
      ? resolveResourceOperationSignal(operation)
      : null;
  if (!signal) {
    return {
      ...marker,
      operationSignalLabel: null,
      operationSignalTone: null,
      operationSignalPulse: false,
    };
  }
  return {
    ...marker,
    operationSignalLabel: signal.label,
    operationSignalTone: signal.tone,
    operationSignalPulse: signal.pulse,
  };
}
