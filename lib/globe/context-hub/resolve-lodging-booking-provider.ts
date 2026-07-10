import { readContextConditionLastBatch } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import type { LocalDiscoveryLodgingKind } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import { resolveAirbnbIntegrationMode } from "@/lib/globe/context-hub/providers/airbnb";

export type LodgingBookingProvider = "airbnb" | "google";

export function resolveLodgingBookingProvider(input?: {
  lodgingKind?: LocalDiscoveryLodgingKind | null;
  contextEventId?: string | null;
}): LodgingBookingProvider {
  const fromSpec =
    input?.lodgingKind ??
    (input?.contextEventId
      ? readContextConditionLastBatch(input.contextEventId)?.spec?.lodgingKind
      : null) ??
    "any";

  if (fromSpec === "airbnb" && resolveAirbnbIntegrationMode() !== "disabled") {
    return "airbnb";
  }
  return "google";
}
