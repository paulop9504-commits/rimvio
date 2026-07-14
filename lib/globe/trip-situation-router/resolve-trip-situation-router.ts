import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { readPlanStepByNodeId } from "@/lib/context-execution/read-active-plan-step";
import type { ContextExecutionPlanV1 } from "@/lib/context-execution/types";
import { copy } from "@/lib/copy/human-ko";
import type { GlobeLayerMode } from "@/lib/globe/globe-layer-mode";
import {
  inferDepartureHubHypothesis,
  listDepartureHubChoices,
} from "@/lib/globe/infer-departure-hub-hypothesis";
import {
  blueprintNeedsDepartureConfirm,
  blueprintNeedsDestination,
  DESTINATION_CHOICE_LABELS,
} from "@/lib/reality-surface/advance-ingress-flow";
import type { RealitySurfaceSession } from "@/lib/reality-surface/project-globe-ingress";
import type {
  TripSituationRouterChip,
  TripSituationRouterState,
} from "@/lib/globe/trip-situation-router/types";

function isStayReadyForDomain(
  blueprint: ContextBlueprint,
  executionPlan?: ContextExecutionPlanV1 | null,
): boolean {
  if (blueprintNeedsDestination(blueprint) || blueprintNeedsDepartureConfirm(blueprint)) {
    return false;
  }
  const stayStep = readPlanStepByNodeId(executionPlan ?? null, "stay");
  if (stayStep) {
    return (
      stayStep.status === "running" ||
      stayStep.status === "ready" ||
      stayStep.status === "prepared"
    );
  }
  return blueprint.executionGraph?.nodes.some((node) => node.id === "stay") ?? false;
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

function buildDestinationChoices(): TripSituationRouterChip[] {
  return DESTINATION_CHOICE_LABELS.map((label, index) => ({
    id: `trip-dest-${index}`,
    label,
    action: "destination" as const,
  }));
}

function buildDomainChoices(destinationLabel: string | null): TripSituationRouterChip[] {
  const router = copy.globe.tripSituationRouter;
  const choices: TripSituationRouterChip[] = [
    {
      id: "trip-lodging",
      label: router.lodgingSearch,
      action: "lodging",
      submitText: router.lodgingSubmit,
    },
  ];
  if (destinationLabel) {
    choices.push({
      id: "trip-eatery",
      label: router.eaterySearch,
      action: "eatery",
      submitText: router.eaterySubmit(destinationLabel),
    });
  }
  return choices;
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
    return {
      stage: "needs_destination",
      reasonKo: router.needsDestination,
      choices: buildDestinationChoices(),
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

  if (isStayReadyForDomain(blueprint, input.session?.executionPlan ?? null)) {
    return {
      stage: "ready_for_domain",
      reasonKo: destinationLabel
        ? router.domainPrompt(destinationLabel)
        : router.domainPromptFallback,
      choices: buildDomainChoices(destinationLabel),
    };
  }

  return null;
}
