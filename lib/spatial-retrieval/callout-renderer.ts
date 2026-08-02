/**
 * Context Aware Callout — dynamic UI from Spatial Retrieval (not Restaurant Card).
 *
 * Example:
 *   🍣 Restaurant A
 *   Hotel Relation: 🏨 Namba Hotel
 *   거리 300m · 도보 4분
 *   ✓ 호텔 근처 · ✓ Day1 저녁 적합 · ✓ 예산 적합
 *   [일정 추가] [비교] [예약 준비]
 *
 * Schema: { entityId, mode:"discovery", evidence[], relationships[], actions[] }
 */

import type {
  SpatialAnchorResolved,
  SpatialCalloutAction,
  SpatialCalloutEvidence,
  SpatialCalloutRelationship,
  SpatialContextAwareCallout,
  SpatialContextRef,
  SpatialDiscoveryConstraints,
  SpatialRealityRelationship,
  SpatialRelation,
  SpatialRetrievedEntity,
} from "@/lib/spatial-retrieval/types";

const DISCOVERY_ACTIONS: readonly SpatialCalloutAction[] = [
  {
    id: "add_to_schedule",
    labelKo: "일정 추가",
    enabled: true,
    primary: true,
  },
  {
    id: "compare",
    labelKo: "비교",
    enabled: true,
    primary: false,
  },
  {
    id: "prepare_reservation",
    labelKo: "예약 준비",
    enabled: true,
    primary: false,
  },
] as const;

function emojiForKind(kind: string): string {
  if (kind === "restaurant" || kind === "cafe") return "🍣";
  if (kind === "hotel") return "🏨";
  if (kind === "attraction") return "🎡";
  return "📍";
}

function relationLabelKo(relation: SpatialRelation): string {
  if (relation === "nearby") return "Nearby";
  if (relation === "walking_distance") return "Walking Distance";
  if (relation === "route_along") return "Route Along";
  if (relation === "same_area") return "Same Area";
  if (relation === "inside") return "Inside";
  return relation;
}

function buildWhyLines(input: {
  readonly entity: SpatialRetrievedEntity;
  readonly anchor: SpatialAnchorResolved;
  readonly constraints: SpatialDiscoveryConstraints;
}): string[] {
  const lines: string[] = [];
  const score = input.entity.contextScore;

  if (
    input.entity.metersFromAnchor != null &&
    input.entity.metersFromAnchor <= 800
  ) {
    lines.push("호텔 근처");
  } else {
    lines.push(`${input.anchor.labelKo} 기준`);
  }

  const tags = input.entity.scheduleTags ?? [];
  const window = input.constraints.scheduleWindow;
  if (
    window === "dinner" ||
    tags.some((t) => /dinner|저녁/i.test(t))
  ) {
    lines.push("Day1 저녁 적합");
  } else if (
    window === "lunch" ||
    tags.some((t) => /lunch|점심/i.test(t))
  ) {
    lines.push("점심 일정 적합");
  } else if (score && score.scheduleFit >= 0.7) {
    lines.push("일정 적합");
  }

  if (score && score.budgetFit >= 0.7) {
    lines.push("예산 적합");
  } else if (input.entity.budgetBand === "low") {
    lines.push("가성비");
  }

  // Deduplicate, cap 3
  return [...new Set(lines)].slice(0, 3);
}

function buildEvidence(input: {
  readonly entity: SpatialRetrievedEntity;
  readonly anchor: SpatialAnchorResolved;
  readonly why: readonly string[];
}): SpatialCalloutEvidence[] {
  const evidence: SpatialCalloutEvidence[] = [
    {
      id: "hotel_relation",
      kind: "hotel_relation",
      labelKo: "Hotel Relation",
      valueKo: `🏨 ${input.anchor.labelKo}`,
    },
  ];

  if (input.entity.metersFromAnchor != null) {
    evidence.push({
      id: "distance",
      kind: "distance",
      labelKo: "거리",
      valueKo: `${input.entity.metersFromAnchor}m`,
    });
  }

  if (input.entity.walkMinutes != null) {
    evidence.push({
      id: "walking",
      kind: "walking",
      labelKo: "도보",
      valueKo: `${input.entity.walkMinutes}분`,
    });
  }

  for (let i = 0; i < input.why.length; i++) {
    evidence.push({
      id: `why_${i}`,
      kind: "why",
      labelKo: "추천 이유",
      valueKo: input.why[i]!,
      checked: true,
    });
  }

  return evidence;
}

/**
 * Build one Context Aware Callout for a discovered Reality Entity.
 */
export function buildContextAwareCallout(input: {
  readonly entity: SpatialRetrievedEntity;
  readonly anchor: SpatialAnchorResolved;
  readonly context: SpatialContextRef;
  readonly relation: SpatialRelation;
  readonly constraints: SpatialDiscoveryConstraints;
  readonly realityEdge?: SpatialRealityRelationship | null;
}): SpatialContextAwareCallout {
  const why = buildWhyLines({
    entity: input.entity,
    anchor: input.anchor,
    constraints: input.constraints,
  });

  const relationships: SpatialCalloutRelationship[] = [
    {
      fromId: input.anchor.entityId,
      toId: input.entity.entityId,
      type: input.relation,
      labelKo: relationLabelKo(input.relation),
      anchorTitleKo: input.anchor.labelKo,
      distanceMeters:
        input.realityEdge?.metadata.distance ??
        input.entity.metersFromAnchor,
      walkingMinutes:
        input.realityEdge?.metadata.walkingTime ??
        input.entity.walkMinutes,
    },
  ];

  return {
    entityId: input.entity.entityId,
    mode: "discovery",
    titleKo: input.entity.titleKo,
    emoji: emojiForKind(input.entity.kind),
    evidence: buildEvidence({
      entity: input.entity,
      anchor: input.anchor,
      why,
    }),
    relationships,
    actions: DISCOVERY_ACTIONS,
    whyLinesKo: why.map((w) => `✓ ${w}`),
  };
}

/**
 * Build Context Aware Callouts for all Spatial Retrieval hits.
 * Replaces flat Restaurant Card list.
 */
export function buildSpatialCalloutSeeds(input: {
  readonly anchor: SpatialAnchorResolved;
  readonly entities: readonly SpatialRetrievedEntity[];
  readonly context: SpatialContextRef;
  readonly relation: SpatialRelation;
  readonly constraints: SpatialDiscoveryConstraints;
  readonly realityRelationships?: readonly SpatialRealityRelationship[];
}): readonly SpatialContextAwareCallout[] {
  return input.entities.map((entity) => {
    const realityEdge =
      input.realityRelationships?.find((r) => r.to === entity.entityId) ??
      null;
    return buildContextAwareCallout({
      entity,
      anchor: input.anchor,
      context: input.context,
      relation: input.relation,
      constraints: input.constraints,
      realityEdge,
    });
  });
}

/** Display sketch for logs / smoke. */
export function formatContextAwareCalloutSketch(
  callout: SpatialContextAwareCallout,
): string {
  const rel = callout.relationships[0];
  const lines = [
    `${callout.emoji} ${callout.titleKo}`,
    "",
    "Hotel Relation:",
    rel ? `🏨 ${rel.anchorTitleKo}` : "—",
    "",
  ];
  for (const e of callout.evidence) {
    if (e.kind === "distance") lines.push(`거리:\n${e.valueKo}`);
    if (e.kind === "walking") lines.push(`도보:\n${e.valueKo}`);
  }
  lines.push("", "추천 이유:");
  for (const w of callout.whyLinesKo) {
    lines.push(w);
  }
  lines.push("", "Actions:");
  lines.push(
    callout.actions.map((a) => `[${a.labelKo}]`).join(" "),
  );
  return lines.join("\n");
}
