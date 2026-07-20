/**
 * Google Maps Reserve handoff — real external booking surface for eateries.
 */

import { buildGoogleMapsPlaceHref } from "@/lib/resolvers/deep-links";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import type { BookingCommitReceipt } from "@/lib/booking-runtime/types";

function readGooglePlaceId(op: RealityOperationV1): string | null {
  const ref = op.sourceRef?.trim() ?? "";
  if (ref.startsWith("maps:")) {
    return ref.slice("maps:".length) || null;
  }
  if (/^ChI[\w-]+$/u.test(ref)) {
    return ref;
  }
  return null;
}

export function executeGoogleMapsReserveBooking(input: {
  readonly operation: RealityOperationV1;
  readonly nowIso?: string;
}): BookingCommitReceipt | null {
  const placeId = readGooglePlaceId(input.operation);
  if (!placeId) {
    return null;
  }

  const handoffUrl = buildGoogleMapsPlaceHref({
    placeId,
    placeLabel: input.operation.labelKo,
  });

  return {
    operationId: input.operation.operationId,
    placeId,
    placeName: input.operation.labelKo,
    provider: "google_maps_reserve",
    confirmationCode: placeId,
    status: "handoff",
    handoffUrl,
    committedAtIso: input.nowIso ?? new Date().toISOString(),
    meta: { surface: "google_maps_reserve" },
  };
}
