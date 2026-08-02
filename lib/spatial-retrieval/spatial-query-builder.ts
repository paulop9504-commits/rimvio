/**
 * Spatial Query Engine — Anchor → spatial search conditions (not distance-only).
 *
 * Input:  Anchor · Target · Relation
 * Output: { center, radius, category, ranking: [distance, rating, contextFit] }
 *
 * Context Score (restaurant):
 *   distance 40% · rating 20% · budgetFit 20% · scheduleFit 20%
 */

import {
  SPATIAL_CONTEXT_SCORE_WEIGHTS,
  SPATIAL_QUERY_RANKING,
  type SpatialAnchorResolved,
  type SpatialContextScoreBreakdown,
  type SpatialDiscoveryIntent,
  type SpatialQueryEngineOutput,
  type SpatialQuerySpec,
  type SpatialRelation,
  type SpatialRetrievedEntity,
} from "@/lib/spatial-retrieval/types";

const DEFAULT_RADIUS: Record<SpatialRelation, number> = {
  nearby: 1000,
  walking_distance: 800,
  route_along: 1500,
  same_area: 2500,
  inside: 500,
};

export function relationDefaultRadius(relation: SpatialRelation): number {
  return DEFAULT_RADIUS[relation] ?? 1000;
}

/**
 * Build Spatial Query from Anchor + Intent.
 */
export function buildSpatialQuery(input: {
  readonly intent: SpatialDiscoveryIntent;
  readonly anchor: SpatialAnchorResolved;
}): SpatialQuerySpec {
  const { intent, anchor } = input;
  const relation = intent.relation;
  const radius =
    intent.constraints.distance ??
    (intent.constraints.walkingTime != null
      ? intent.constraints.walkingTime * 80
      : relationDefaultRadius(relation));

  const center =
    anchor.lat != null && anchor.lng != null
      ? { lat: anchor.lat, lng: anchor.lng }
      : null;

  const category =
    intent.constraints.category?.trim() || intent.targetEntity;

  const ranking = [...SPATIAL_QUERY_RANKING] as SpatialQuerySpec["ranking"];

  const engine: SpatialQueryEngineOutput = {
    center,
    radius,
    category,
    ranking,
    relation,
  };

  return {
    targetEntity: intent.targetEntity,
    relation,
    anchor,
    constraints: intent.constraints,
    center,
    radiusMeters: radius,
    radius,
    category,
    ranking,
    engine,
  };
}

/** Product wire view of the query. */
export function toSpatialQueryEngineOutput(
  query: SpatialQuerySpec,
): SpatialQueryEngineOutput {
  return query.engine;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Context Score — never rank by distance alone.
 */
export function scoreSpatialContext(input: {
  readonly query: SpatialQuerySpec;
  readonly metersFromAnchor: number | null;
  readonly rating?: number | null;
  readonly budgetBand?: string | null;
  readonly scheduleTags?: readonly string[];
}): SpatialContextScoreBreakdown {
  const { query } = input;
  const radius = Math.max(1, query.radius);

  // distance: closer → higher (within radius)
  let distance = 0;
  if (input.metersFromAnchor != null) {
    distance = clamp01(1 - input.metersFromAnchor / radius);
  }

  // rating: assume 0–5 scale
  const rating = clamp01((input.rating ?? 3.5) / 5);

  // budgetFit: match constraint band or neutral mid
  const want = query.constraints.budgetBand?.toLowerCase() ?? null;
  const got = input.budgetBand?.toLowerCase() ?? null;
  let budgetFit = 0.7;
  if (want && got) {
    budgetFit = want === got ? 1 : want.includes(got) || got.includes(want) ? 0.75 : 0.35;
  } else if (!want) {
    budgetFit = 0.75;
  }

  // scheduleFit: lunch/dinner/any tags vs scheduleWindow
  const window = query.constraints.scheduleWindow?.toLowerCase() ?? null;
  const tags = (input.scheduleTags ?? []).map((t) => t.toLowerCase());
  let scheduleFit = 0.7;
  if (window && tags.length > 0) {
    scheduleFit = tags.some((t) => t.includes(window) || window.includes(t))
      ? 1
      : 0.4;
  } else if (!window) {
    scheduleFit = 0.8;
  }

  const w = SPATIAL_CONTEXT_SCORE_WEIGHTS;
  const total = clamp01(
    distance * w.distance +
      rating * w.rating +
      budgetFit * w.budgetFit +
      scheduleFit * w.scheduleFit,
  );

  return {
    distance: Math.round(distance * 1000) / 1000,
    rating: Math.round(rating * 1000) / 1000,
    budgetFit: Math.round(budgetFit * 1000) / 1000,
    scheduleFit: Math.round(scheduleFit * 1000) / 1000,
    total: Math.round(total * 1000) / 1000,
  };
}

/**
 * Rank retrieved entities by Context Score (not distance sort).
 */
export function rankByContextScore(
  entities: readonly SpatialRetrievedEntity[],
): SpatialRetrievedEntity[] {
  return [...entities].sort((a, b) => {
    const ta = a.contextScore?.total ?? 0;
    const tb = b.contextScore?.total ?? 0;
    if (tb !== ta) return tb - ta;
    // tie-break: nearer
    return (a.metersFromAnchor ?? 1e9) - (b.metersFromAnchor ?? 1e9);
  });
}

/**
 * Attach Context Scores then rank — Spatial Query Engine post-retrieval step.
 */
export function applySpatialQueryRanking(input: {
  readonly query: SpatialQuerySpec;
  readonly entities: readonly SpatialRetrievedEntity[];
}): readonly SpatialRetrievedEntity[] {
  const scored = input.entities.map((e) => ({
    ...e,
    contextScore: scoreSpatialContext({
      query: input.query,
      metersFromAnchor: e.metersFromAnchor,
      rating: e.rating,
      budgetBand: e.budgetBand,
      scheduleTags: e.scheduleTags,
    }),
  }));
  return rankByContextScore(scored);
}
