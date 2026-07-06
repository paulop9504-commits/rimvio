import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { copy } from "@/lib/copy/human-ko";
import { inferDepartureHubHypothesis } from "@/lib/globe/infer-departure-hub-hypothesis";
import {
  blueprintNeedsDepartureConfirm,
  blueprintNeedsDestination,
} from "@/lib/reality-surface/advance-ingress-flow";

function readDestinationFromBlueprint(blueprint: ContextBlueprint): string | null {
  const fromTruth = blueprint.resourcePlan.knownTruth.find(
    (row) => row.slotId === "destination",
  )?.value;
  if (typeof fromTruth === "string" && fromTruth.trim()) {
    return fromTruth.trim();
  }
  return blueprint.constraints.destination?.label?.trim() ?? null;
}

/** L1 — 맥락 생성 확인 (맞춤 대화 assistant). */
export function buildTripContextCreatedChatLine(title: string): string {
  return copy.globe.tripSituationRouter.contextCreated(title.trim() || "여행");
}

/** L1 — 현재 Blueprint 단계에 맞는 다음 행동 한 줄. */
export function buildTripFlowNextStepLine(input: {
  blueprint?: ContextBlueprint | null;
  destinationLabel?: string | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
}): string {
  const router = copy.globe.tripSituationRouter;
  const blueprint = input.blueprint ?? null;

  if (!blueprint || blueprintNeedsDestination(blueprint)) {
    return router.nextStepPickDestination;
  }

  const destinationLabel =
    input.destinationLabel?.trim() ||
    readDestinationFromBlueprint(blueprint) ||
    "여행";

  if (blueprintNeedsDepartureConfirm(blueprint)) {
    const hypothesis = inferDepartureHubHypothesis({
      destinationLabel,
      viewerLat: input.viewerLat,
      viewerLng: input.viewerLng,
    });
    if (hypothesis.confidence === "high") {
      return router.nextStepConfirmDeparture(hypothesis.hub.shortLabelKo);
    }
    return router.nextStepPickDeparture;
  }

  return router.nextStepPickDomain(destinationLabel);
}

export function composeTripFlowChatAssistantLine(input: {
  headline: string;
  blueprint?: ContextBlueprint | null;
  destinationLabel?: string | null;
  viewerLat?: number | null;
  viewerLng?: number | null;
}): string {
  const next = buildTripFlowNextStepLine(input);
  const headline = input.headline.trim();
  if (!headline) {
    return next;
  }
  return `${headline}\n${next}`;
}

/** Globe Ingress 직후 — 맥락 생성 + 다음 스텝. */
export function buildTripIngressCreatedChatAssistantLine(input: {
  eventTitle: string;
  blueprint: ContextBlueprint;
}): string {
  return composeTripFlowChatAssistantLine({
    headline: buildTripContextCreatedChatLine(input.eventTitle),
    blueprint: input.blueprint,
  });
}
