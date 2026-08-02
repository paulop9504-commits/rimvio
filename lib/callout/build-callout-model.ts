/**
 * Build CalloutViewModel from RimvioObject + registry + session graph context.
 * Core never branches on hotel/restaurant UI — only registry descriptors.
 */

import {
  CALLOUT_MODE_LABEL_KO,
  getCalloutObjectTypeDescriptor,
  OBJECT_STATE_LABEL_KO,
} from "@/lib/callout/callout-registry";
import { scoreObserveAiScore } from "@/lib/callout/build-observe-evidence";
import type {
  ObjectRelation,
  ObjectRelationType,
} from "@/lib/callout/object-relation";
import {
  formatMinutesDelta,
  formatWonDelta,
  parseWonAmount,
  runWhatIfSimulation,
  simulationImpactLinesKo,
} from "@/lib/callout/simulation";
import type { SimulationItineraryAnchor } from "@/lib/callout/simulation/types";
import type {
  CalloutExploreEdge,
  CalloutPrepareStep,
  CalloutSimulationDelta,
  CalloutViewModel,
  RimvioObject,
  RimvioObjectState,
} from "@/lib/callout/types";
import { RIMVIO_OBJECT_STATES } from "@/lib/callout/types";

export type CalloutGraphNeighbor = {
  readonly objectId: string;
  readonly title: string;
  readonly kindKey: string;
  readonly labelKo: string;
  readonly meters: number | null;
};

export type CalloutGraphAlternative = {
  readonly objectId: string;
  readonly title: string;
  readonly priceLabelKo: string | null;
  readonly priceWon: number | null;
  readonly metersFromCurrent: number | null;
  readonly rating: number | null;
  readonly lat: number;
  readonly lng: number;
};

function stateReached(
  current: RimvioObjectState,
  step: RimvioObjectState,
): boolean {
  return (
    RIMVIO_OBJECT_STATES.indexOf(current) >=
    RIMVIO_OBJECT_STATES.indexOf(step)
  );
}

function buildExploreEdges(
  object: RimvioObject,
  neighbors: readonly CalloutGraphNeighbor[],
): CalloutExploreEdge[] {
  const desc = getCalloutObjectTypeDescriptor(object.type);
  if (!desc) return [];

  return desc.exploreRelations.map((rel) => {
    const matches = neighbors.filter((n) =>
      rel.matchKinds.some(
        (k) =>
          n.kindKey === k ||
          n.labelKo.includes(rel.labelKo) ||
          n.kindKey.includes(k),
      ),
    );
    const first = matches[0];
    return {
      id: `${object.id}:${rel.id}`,
      relationId: rel.id,
      labelKo: rel.labelKo,
      targetObjectId: first?.objectId ?? null,
      hintKo: first
        ? first.meters != null
          ? `${first.title} · ${first.meters}m`
          : first.title
        : null,
      count: matches.length > 0 ? matches.length : null,
    };
  });
}

function buildSimulationDeltas(
  object: RimvioObject,
  alternatives: readonly CalloutGraphAlternative[],
  anchors: readonly SimulationItineraryAnchor[] = [],
): CalloutSimulationDelta[] {
  const currentPriceWon = parseWonAmount(object.facts.priceLabelKo);
  const scenarioKind =
    object.type === "hotel" ? "change_hotel" : "change_object";

  return alternatives.slice(0, 3).map((alt) => {
    const result = runWhatIfSimulation({
      scenarioKind,
      current: {
        objectId: object.id,
        title: object.title,
        typeLabelKo: object.type,
        priceWon: currentPriceWon,
        priceLabelKo: object.facts.priceLabelKo,
        lat: object.location.lat,
        lng: object.location.lng,
        dayLabelKo: null,
      },
      proposal: {
        objectId: alt.objectId,
        title: alt.title,
        priceWon: alt.priceWon,
        priceLabelKo: alt.priceLabelKo,
        lat: alt.lat,
        lng: alt.lng,
      },
      anchors,
    });

    const budgetChange = result.changes.find((c) => c.kind === "budget");
    const distanceChange = result.changes.find((c) => c.kind === "distance");
    const scheduleChange = result.changes.find((c) => c.kind === "schedule");

    return {
      id: alt.objectId,
      alternativeObjectId: alt.objectId,
      alternativeTitle: alt.title,
      linesKo: simulationImpactLinesKo(result),
      budgetDeltaKo: budgetChange
        ? formatWonDelta(budgetChange.delta)
        : null,
      routeDeltaKo:
        scheduleChange?.valueKo ??
        (distanceChange
          ? `거리 ${formatMinutesDelta(distanceChange.delta)}`
          : null),
      result,
    };
  });
}

export function buildCalloutViewModel(input: {
  object: RimvioObject;
  neighbors?: readonly CalloutGraphNeighbor[];
  alternatives?: readonly CalloutGraphAlternative[];
  /** Prefetched Explore buckets from getRelations */
  relationBuckets?: Record<
    ObjectRelationType,
    readonly ObjectRelation[]
  > | null;
  simulationAnchors?: readonly SimulationItineraryAnchor[] | null;
}): CalloutViewModel | null {
  const desc = getCalloutObjectTypeDescriptor(input.object.type);
  if (!desc) return null;

  const object = input.object;
  const neighbors = input.neighbors ?? [];
  const alternatives = (input.alternatives ?? []).filter(
    (a) => a.objectId !== object.id,
  );

  const prepareSteps: CalloutPrepareStep[] = desc.prepareStepDefs.map((s) => ({
    id: s.id,
    labelKo: s.labelKo,
    done: s.isDone(object),
  }));

  const canCreateDraft =
    object.facts.canPrepare ||
    prepareSteps.filter((s) => s.done).length >= 2;

  const emptyBuckets: Record<ObjectRelationType, readonly ObjectRelation[]> = {
    nearby: [],
    similar: [],
    connected: [],
    route: [],
  };
  const buckets = input.relationBuckets ?? emptyBuckets;

  return {
    object,
    typeLabelKo: desc.labelKo,
    stateLabelKo: OBJECT_STATE_LABEL_KO[object.state],
    lifecycle: RIMVIO_OBJECT_STATES.map((state) => ({
      state,
      labelKo: OBJECT_STATE_LABEL_KO[state],
      reached: stateReached(object.state, state),
    })),
    modes: desc.modes,
    observe: {
      whyLinesKo: object.facts.whyLinesKo,
      evidence: object.evidence,
      aiScore: scoreObserveAiScore(object.evidence),
    },
    explore: {
      edges: buildExploreEdges(object, neighbors),
      buckets,
      connectTargets: desc.connectTargets,
    },
    simulate: {
      currentTitle: object.title,
      deltas: buildSimulationDeltas(
        object,
        alternatives,
        input.simulationAnchors ?? [],
      ),
      emptyKo: desc.simulateEmptyKo,
    },
    prepare: {
      steps: prepareSteps,
      ctaKo: desc.prepareCtaKo,
      canCreateDraft,
    },
    commit: {
      summaryKo:
        object.state === "committed"
          ? "이미 확정된 객체예요"
          : "실행·결제·전송은 Field에서만 합니다",
      ctaKo: desc.commitCtaKo,
      enabled: object.state !== "committed" && canCreateDraft,
    },
    intentAxes: desc.intentAxes,
    connectTargets: desc.connectTargets,
    askPlaceholderKo: desc.askPlaceholderKo,
  };
}

export function calloutModeLabelKo(
  mode: import("@/lib/callout/types").CalloutMode,
): string {
  return CALLOUT_MODE_LABEL_KO[mode];
}
