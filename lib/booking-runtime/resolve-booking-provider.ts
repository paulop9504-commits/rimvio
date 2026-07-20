/**
 * Resolve booking provider for a prepared Operation.
 */

import { isLiteApiConfigured } from "@/lib/globe/context-hub/providers/liteapi/liteapi-config";
import { isGooglePlacesConfigured } from "@/lib/locate/google-places-config";
import type { BookingProviderId } from "@/lib/booking-runtime/types";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";

export function resolveBookingProviderForOperation(
  op: RealityOperationV1,
): BookingProviderId {
  const engine = op.engineId?.trim() ?? "";
  if (engine === "google_maps_reserve" || engine === "liteapi_booking") {
    return engine;
  }

  const ref = op.sourceRef?.trim() ?? "";
  if (op.kind === "eatery" && ref.startsWith("maps:") && isGooglePlacesConfigured()) {
    return "google_maps_reserve";
  }
  if (
    op.kind === "lodging" &&
    op.preview.resourceId?.trim() &&
    isLiteApiConfigured()
  ) {
    return "liteapi_booking";
  }
  return "demo_stub";
}
