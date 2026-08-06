import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import {
  inferDepartureHubHypothesis,
  listDepartureHubChoices,
} from "@/lib/globe/infer-departure-hub-hypothesis";
import {
  DESTINATION_OTHER_CHIP_ID,
  pickPromptForCountry,
} from "@/lib/globe/country-travel-hubs";
import {
  blueprintNeedsDepartureConfirm,
  blueprintNeedsDestination,
  destinationChoiceLabelsForBlueprint,
} from "@/lib/reality-surface/advance-ingress-flow";
import type { RealitySurfaceSession } from "@/lib/reality-surface/project-globe-ingress";
import type {
  TripSituationRouterChip,
  TripSituationRouterState,
} from "@/lib/globe/trip-situation-router/types";
import { buildTripPrepareChips } from "@/lib/globe/trip-situation-router/build-trip-prepare-offer";

function destinationReadyForPrepare(
  blueprint: ContextBlueprint,
): boolean {
  return (
    !blueprintNeedsDestination(blueprint) &&
    !blueprintNeedsDepartureConfirm(blueprint)
  );
}

function readDestinationLabel(blueprint: ContextBlueprint): string | null {
  const fromTruth = blueprint.resourcePlan.knownTruth.find(
    (row) => row.slotId === "destination",
  )?.value;
  if (typeof fromTruth === "string" && fromTruth.trim()) {
    return fromTruth.trim();
  }
  return blueprint.constraints.destination?.label?.trim() ?? null;
}

function readRegionLabel(blueprint: ContextBlueprint): string | null {
  const fromTruth = blueprint.resourcePlan.knownTruth.find(
    (row) => row.slotId === "region",
  )?.value;
  if (typeof fromTruth === "string" && fromTruth.trim()) {
    return fromTruth.trim();
  }
  return null;
}

function buildDestinationChoices(
  blueprint: ContextBlueprint,
): TripSituationRouterChip[] {
  const router = copy.globe.tripSituationRouter;
  const labels = destinationChoiceLabelsForBlueprint(blueprint);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const chips: TripSituationRouterChip[] = labels.slice(0, 8).map((label, index) => ({
    id: `trip-dest-${index}`,
    label: `${letters[index] ?? String(index + 1)} · ${label}`,
    action: "destination" as const,
    submitText: label,
  }));
  const otherLetter = letters[chips.length] ?? String(chips.length + 1);
  chips.push({
    id: DESTINATION_OTHER_CHIP_ID,
    label: `${otherLetter} · ${router.destinationOther}`,
    action: "destination_other",
  });
  return chips;
}

function buildDepartureConfirmChoices(input: {
  destinationLabel: string;
  viewerLat?: number | null;
  viewerLng?: number | null;
}): TripSituationRouterState {
  const router = copy.globe.tripSituationRouter;
  const hypothesis = inferDepartureHubHypothesis({
    destinationLabel: input.destinationLabel,
    viewerLat: input.viewerLat,
    viewerLng: input.viewerLng,
  });

  if (hypothesis.confidence === "low") {
    return {
      stage: "pick_departure_hub",
      reasonKo: router.departureAskOpen,
      choices: listDepartureHubChoices({
        destinationLabel: input.destinationLabel,
        viewerLat: input.viewerLat,
        viewerLng: input.viewerLng,
      }).map((hub) => ({
        id: `trip-hub-${hub.id}`,
        label: hub.shortLabelKo,
        action: "departure_hub" as const,
        departureHubId: hub.id,
        homeLabel: hypothesis.homeLabel,
      })),
    };
  }

  return {
    stage: "needs_departure_confirm",
    reasonKo: router.departureConfirmHigh(hypothesis.hub.shortLabelKo),
    choices: [
      {
        id: "trip-dep-confirm",
        label: router.departureConfirmYes,
        action: "departure_confirm",
        departureHubId: hypothesis.hub.id,
        homeLabel: hypothesis.homeLabel,
      },
      {
        id: "trip-dep-other",
        label: router.departureOther,
        action: "departure_other",
      },
    ],
  };
}

function buildDeparturePickerChoices(input: {
  destinationLabel: string;
  viewerLat?: number | null;
  viewerLng?: number | null;
  homeLabel?: string | null;
}): TripSituationRouterState {
  const router = copy.globe.tripSituationRouter;
  const homeLabel =
    input.homeLabel?.trim() ||
    inferDepartureHubHypothesis({
      destinationLabel: input.destinationLabel,
      viewerLat: input.viewerLat,
      viewerLng: input.viewerLng,
    }).homeLabel;

  return {
    stage: "pick_departure_hub",
    reasonKo: router.departureAskOpen,
    choices: listDepartureHubChoices({
      destinationLabel: input.destinationLabel,
      viewerLat: input.viewerLat,
      viewerLng: input.viewerLng,
    }).map((hub) => ({
      id: `trip-hub-${hub.id}`,
      label: hub.shortLabelKo,
      action: "departure_hub" as const,
      departureHubId: hub.id,
      homeLabel,
    })),
  };
}

export function resolveTripSituationRouter(input: {
  layerMode: GlobeLayerMode;
  suppressed?: boolean;
  session: RealitySurfaceSession | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
  departurePickerOpen?: boolean;
}): TripSituationRouterState | null {
  if (input.suppressed || input.layerMode !== "personal") {
    return null;
  }

  const blueprint = input.session?.operatorBlueprint ?? null;
  const router = copy.globe.tripSituationRouter;

  if (!blueprint) {
    return {
      stage: "idle",
      reasonKo: router.idleReason,
      choices: [
        {
          id: "trip-spawn",
          label: router.spawnTrip,
          action: "spawn",
          submitText: router.spawnTripSubmit,
        },
      ],
    };
  }

  if (blueprintNeedsDestination(blueprint)) {
    const region = readRegionLabel(blueprint);
    const pickPrompt = pickPromptForCountry(region);
    return {
      stage: "needs_destination",
      reasonKo: pickPrompt ?? router.needsDestination,
      choices: buildDestinationChoices(blueprint),
    };
  }

  const destinationLabel = readDestinationLabel(blueprint);
  if (blueprintNeedsDepartureConfirm(blueprint) && destinationLabel) {
    if (input.departurePickerOpen) {
      return buildDeparturePickerChoices({
        destinationLabel,
        viewerLat: input.viewerLat,
        viewerLng: input.viewerLng,
      });
    }
    return buildDepartureConfirmChoices({
      destinationLabel,
      viewerLat: input.viewerLat,
      viewerLng: input.viewerLng,
    });
  }

  if (destinationReadyForPrepare(blueprint)) {
    return {
      stage: "ready_for_domain",
      reasonKo: destinationLabel
        ? router.prepareOffer(destinationLabel)
        : router.domainPromptFallback,
      choices: buildTripPrepareChips(destinationLabel),
    };
  }

  return null;
}
