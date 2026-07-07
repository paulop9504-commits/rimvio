import {
  subscribeGlobeLodgingDiscoveryReveal,
  subscribeGlobeLodgingDiscoveryStart,
} from "@/lib/globe/lodging/globe-lodging-discovery-bridge";
import { upsertResourceOperation } from "@/lib/resource-operation/resource-operation-store";

/** Wire staged lodging pin reveal → searching operation signals. */
export function subscribeLodgingDiscoveryResourceOperations(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const offStart = subscribeGlobeLodgingDiscoveryStart((detail) => {
    for (const resourceId of detail.resourceIds) {
      upsertResourceOperation({
        contextEventId: detail.eventId,
        resourceId,
        domain: "lodging",
        label: "숙소",
        stage: "searching",
      });
    }
  });
  const offReveal = subscribeGlobeLodgingDiscoveryReveal((detail) => {
    upsertResourceOperation({
      contextEventId: detail.eventId,
      resourceId: detail.resourceId,
      domain: "lodging",
      label: "숙소",
      stage: "searching",
    });
  });
  return () => {
    offStart();
    offReveal();
  };
}
