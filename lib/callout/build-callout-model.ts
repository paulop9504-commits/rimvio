/**
 * Build CalloutViewModel from RimvioObject + registry + session graph context.
 * Core never branches on hotel/restaurant UI — only registry descriptors.
 */

import {
  scoreObserveAiScore,
} from "@/lib/callout/build-observe-evidence";
import type {
  ObjectRelation,
  ObjectRelationType,
} from "@/lib/callout/object-relation";
import type {
  CalloutExploreEdge,
  CalloutPrepareStep,
  CalloutSimulationDelta,
  CalloutViewModel,
  RimvioObject,
  RimvioObjectState,
} from "@/lib/callout/types";
import { RIMVIO_OBJECT_STATES } from "@/lib/callout/types";
import {
  CALLOUT_MODE_LABEL_KO,
  getCalloutObjectTypeDescriptor,
  OBJECT_STATE_LABEL_KO,
} from "@/lib/callout/callout-registry";

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
  readonly metersFromCurrent: number | null;
  readonly rating: number | null;
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
): CalloutSimulationDelta[] {
  return alternatives.slice(0, 3).map((alt) => {
    const lines: string[] = [];
    let budgetDeltaKo: string | null = null;
    let routeDeltaKo: string | null = null;

    if (alt.priceLabelKo && object.facts.priceLabelKo) {
      lines.push(`가격 ${object.facts.priceLabelKo} → ${alt.priceLabelKo}`);
      budgetDeltaKo = alt.priceLabelKo;
    } else if (alt.priceLabelKo) {
      lines.push(`가격 ${alt.priceLabelKo}`);
      budgetDeltaKo = alt.priceLabelKo;
    }

    if (alt.metersFromCurrent != null && Number.isFinite(alt.metersFromCurrent)) {
      const mins = Math.max(1, Math.round(alt.metersFromCurrent / 80));
      const route = `이동 약 ${mins}분 (${alt.metersFromCurrent}m)`;
      lines.push(route);
      routeDeltaKo = route;
    }

    if (alt.rating != null && object.facts.rating != null) {
      const d = alt.rating - object.facts.rating;
      if (Math.abs(d) >= 0.1) {
        lines.push(
          d > 0
            ? `평점 +${d.toFixed(1)}`
            : `평점 ${d.toFixed(1)}`,
        );
      }
    }

    if (lines.length === 0) {
      lines.push(`${alt.title}로 바꿔 볼 수 있어요`);
    }

    return {
      id: alt.objectId,
      alternativeObjectId: alt.objectId,
      alternativeTitle: alt.title,
      linesKo: lines,
      budgetDeltaKo,
      routeDeltaKo,
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
      deltas: buildSimulationDeltas(object, alternatives),
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
