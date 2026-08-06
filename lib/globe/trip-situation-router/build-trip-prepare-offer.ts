/**
 * Cursor-like trip prepare offer — acknowledge destination + chips that set Workspace.
 */

import { syncPortalComposeClarifyToChat } from "@/lib/globe/chat/sync-portal-compose-to-chat";
import { copy } from "@/lib/copy/human-ko";
import type { TripSituationRouterChip } from "@/lib/globe/trip-situation-router/types";

export const TRIP_PREPARE_SLOT_ID = "trip_prepare";

export function buildTripPrepareOfferLine(destinationLabel: string): string {
  const dest = destinationLabel.trim() || "여행";
  return copy.globe.tripSituationRouter.prepareOffer(dest);
}

/** Soft chips — tap submits Workspace work NL (에이전트가 바로 세팅). */
export function buildTripPrepareChips(
  destinationLabel: string | null,
): TripSituationRouterChip[] {
  const router = copy.globe.tripSituationRouter;
  const dest = destinationLabel?.trim() || null;
  const chips: TripSituationRouterChip[] = [
    {
      id: "trip-lodging",
      label: router.lodgingSearch,
      action: "lodging",
      submitText: router.lodgingSubmit,
    },
  ];
  if (dest) {
    chips.push(
      {
        id: "trip-eatery",
        label: router.eaterySearch,
        action: "eatery",
        submitText: router.eaterySubmit(dest),
      },
      {
        id: "trip-route",
        label: router.routeSearch,
        action: "route",
        submitText: router.routeSubmit(dest),
      },
      {
        id: "trip-itinerary",
        label: router.itinerarySearch,
        action: "itinerary",
        submitText: router.itinerarySubmit(dest),
      },
      {
        id: "trip-prep-all",
        label: router.prepAllSearch,
        action: "prep_all",
        submitText: router.prepAllSubmit(dest),
      },
    );
  }
  return chips;
}

/** Chat thread — Cursor-style suggestions under the offer line. */
export function offerTripPrepareChips(input: {
  readonly graphId: string;
  readonly destinationLabel: string | null;
  readonly userText?: string | null;
  readonly skipUserEcho?: boolean;
}): boolean {
  const dest = input.destinationLabel?.trim() || null;
  if (!dest) return false;
  const choices = buildTripPrepareChips(dest).map((chip) => ({
    id: chip.submitText?.trim() || chip.label,
    labelKo: chip.label,
  }));
  return syncPortalComposeClarifyToChat({
    graphId: input.graphId,
    userText: input.skipUserEcho ? "" : input.userText?.trim() || "",
    questionKo: buildTripPrepareOfferLine(dest),
    clarifyKind: "slot",
    slotId: TRIP_PREPARE_SLOT_ID,
    choices,
  });
}
