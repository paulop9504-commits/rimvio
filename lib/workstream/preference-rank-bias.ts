/**
 * Preference Graph → lodging / eatery rank bias (ADR-043).
 * Soft overlays on top of profile-weighted dimensions — not a parallel ranker.
 */

import type { PreferenceGraph } from "@/lib/workstream/preference-graph";
import {
  preferenceWeight,
  readPreferenceGraph,
} from "@/lib/workstream/preference-graph";

function clampDelta(value: number): number {
  return Math.max(-24, Math.min(24, Math.round(value)));
}

function blobHas(blob: string, re: RegExp): boolean {
  return re.test(blob);
}

export type LodgingPreferenceBiasInput = {
  readonly name: string;
  readonly address?: string | null;
  readonly priceKrw?: number | null;
  readonly distanceKm?: number | null;
  readonly graph?: PreferenceGraph | null;
};

export type EateryPreferenceBiasInput = {
  readonly name: string;
  readonly address?: string | null;
  readonly categoryLabel?: string | null;
  readonly cuisineHint?: string | null;
  readonly specialReasonKo?: string | null;
  readonly priceLevel?: number | null;
  readonly distanceKm?: number | null;
  readonly reviewCount?: number | null;
  readonly graph?: PreferenceGraph | null;
};

function weightOf(
  kind: Parameters<typeof preferenceWeight>[0],
  graph: PreferenceGraph | null | undefined,
): number {
  if (graph) {
    return graph.edges.find((e) => e.kind === kind)?.weight ?? 0;
  }
  return preferenceWeight(kind);
}

/** Score delta for lodging rows from Preference Graph. */
export function lodgingPreferenceScoreDelta(
  input: LodgingPreferenceBiasInput,
): number {
  const graph = input.graph ?? readPreferenceGraph();
  const walk = weightOf("walk_prefer", graph);
  const quiet = weightOf("quiet_hotel", graph);
  const subway = weightOf("subway_prefer", graph);
  const budget = weightOf("budget_sensitive", graph);
  const luxury = weightOf("luxury", graph);

  if (walk + quiet + subway + budget + luxury < 0.05) return 0;

  const blob = [input.name, input.address].filter(Boolean).join(" ");
  let delta = 0;
  const km = input.distanceKm;

  if (walk >= 0.35 && km != null && Number.isFinite(km)) {
    if (km <= 1) delta += 14 * walk;
    else if (km <= 2) delta += 7 * walk;
    else if (km >= 4.5) delta -= 12 * walk;
  }

  if (quiet >= 0.35) {
    if (
      blobHas(
        blob,
        /조용|한적|quiet|residential|공원|park.?side/iu,
      )
    ) {
      delta += 12 * quiet;
    }
    if (
      blobHas(
        blob,
        /party|클럽|호스텔|hostel|capsule|캡슐|nightlife|유흥/iu,
      )
    ) {
      delta -= 16 * quiet;
    }
  }

  if (subway >= 0.35) {
    if (blobHas(blob, /역|駅|station|metro|지하철|전철|지하철역/iu)) {
      delta += 11 * subway;
    }
  }

  const price = input.priceKrw;
  if (price != null && Number.isFinite(price) && price > 0) {
    if (budget >= 0.35 && luxury < 0.45) {
      // Lower price preferred — mild curve around mid KRW band.
      if (price <= 90_000) delta += 10 * budget;
      else if (price <= 140_000) delta += 4 * budget;
      else if (price >= 220_000) delta -= 10 * budget;
    }
    if (luxury >= 0.35) {
      if (price >= 220_000) delta += 10 * luxury;
      else if (price <= 90_000) delta -= 6 * luxury;
      if (blobHas(blob, /스위트|suite|5성|럭셔리|luxury|premium/iu)) {
        delta += 8 * luxury;
      }
    }
  }

  return clampDelta(delta);
}

/** Score delta for eatery rows from Preference Graph. */
export function eateryPreferenceScoreDelta(
  input: EateryPreferenceBiasInput,
): number {
  const graph = input.graph ?? readPreferenceGraph();
  const walk = weightOf("walk_prefer", graph);
  const noWait = weightOf("no_waiting", graph);
  const subway = weightOf("subway_prefer", graph);
  const budget = weightOf("budget_sensitive", graph);
  const luxury = weightOf("luxury", graph);

  if (walk + noWait + subway + budget + luxury < 0.05) return 0;

  const blob = [
    input.name,
    input.address,
    input.categoryLabel,
    input.cuisineHint,
    input.specialReasonKo,
  ]
    .filter(Boolean)
    .join(" ");
  let delta = 0;
  const km = input.distanceKm;

  if (walk >= 0.35 && km != null && Number.isFinite(km)) {
    if (km <= 0.8) delta += 14 * walk;
    else if (km <= 1.5) delta += 7 * walk;
    else if (km >= 3.5) delta -= 11 * walk;
  }

  if (noWait >= 0.35) {
    if (blobHas(blob, /웨이팅|줄\s*서|대기|유명|핫플|필수\s*맛집|landmark/iu)) {
      delta -= 14 * noWait;
    }
    if (blobHas(blob, /로컬|골목|숨은|한적|캐주얼|casual/iu)) {
      delta += 9 * noWait;
    }
    const reviews = input.reviewCount;
    if (reviews != null && Number.isFinite(reviews) && reviews >= 2500) {
      delta -= 6 * noWait;
    }
  }

  if (subway >= 0.35) {
    if (blobHas(blob, /역|駅|station|metro|지하철/iu)) {
      delta += 10 * subway;
    }
  }

  const level = input.priceLevel;
  if (level != null && Number.isFinite(level)) {
    if (budget >= 0.35 && luxury < 0.45) {
      if (level <= 1) delta += 10 * budget;
      else if (level >= 3) delta -= 10 * budget;
    }
    if (luxury >= 0.35) {
      if (level >= 3) delta += 10 * luxury;
      else if (level <= 1) delta -= 6 * luxury;
    }
  }

  return clampDelta(delta);
}
