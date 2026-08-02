/**
 * Dynamic Callout Runtime — Reality Object Control Surface entry.
 */

import { buildDynamicCalloutSchema } from "@/lib/callout/dynamic/build-ui-schema";
import { resolveDynamicCalloutState } from "@/lib/callout/dynamic/resolve-state";
import type {
  DynamicCalloutInput,
  DynamicCalloutSchema,
  DynamicCalloutState,
} from "@/lib/callout/dynamic/types";
import type { RimvioObject } from "@/lib/callout/types";

export function buildDynamicCallout(
  input: DynamicCalloutInput,
): DynamicCalloutSchema {
  return buildDynamicCalloutSchema(input);
}

/** Bridge existing RimvioObject → Dynamic Callout Object slice. */
export function dynamicObjectFromRimvio(
  object: RimvioObject,
): DynamicCalloutInput["object"] {
  return {
    id: object.id,
    title: object.title,
    type: object.type,
    priceLabelKo: object.facts.priceLabelKo,
    priceWon: null,
    whyLinesKo: object.facts.whyLinesKo,
    evidence: object.evidence.map((e) => ({
      id: e.id,
      title: e.title,
      value: e.value,
      present: e.present,
    })),
    canPrepare: object.facts.canPrepare,
  };
}

/** Same Reality Object → different schemas by state (situation). */
export function schemasForSameObjectAcrossStates(input: {
  readonly base: Omit<DynamicCalloutInput, "forceState" | "intent" | "compare">;
  readonly states: readonly DynamicCalloutState[];
}): readonly DynamicCalloutSchema[] {
  return input.states.map((state) =>
    buildDynamicCallout({
      ...input.base,
      forceState: state,
      intent:
        state === "Compare"
          ? { action: "compare", target: "hotel", rawText: "비교해줘" }
          : state === "Prepare"
            ? { action: "prepare", target: "hotel", rawText: "예약 준비해" }
            : state === "Simulate"
              ? { action: "simulate", target: "hotel", rawText: "시뮬레이션" }
              : state === "Commit"
                ? { action: "commit", target: "hotel", rawText: "확정" }
                : state === "Analyze"
                  ? {
                      action: "analyze_context",
                      target: "hotel",
                      rawText: "분석",
                    }
                  : { action: "filter", target: "hotel", rawText: "보여줘" },
      compare:
        state === "Compare" || state === "Simulate"
          ? {
              alternativeTitle: "Capsule Alt",
              priceDeltaWon: -40_000,
              priceDeltaKo: "가격 40,000원 감소",
              distanceDeltaMeters: 200,
              distanceDeltaKo: "거리 200m 멀어짐",
              impactSummaryKo: "가성비↑ · 동선 소폭 증가",
            }
          : null,
    }),
  );
}

export { resolveDynamicCalloutState };
