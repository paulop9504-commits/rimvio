/**
 * Anchor Resolver — find reference Entity inside current Workspace Context.
 *
 * Priority:
 *  1. Currently selected Entity
 *  2. Context Anchor
 *  3. Recent Interaction Entity
 *  4. Natural Language Entity Matching
 *
 * On failure: never ask "어느 호텔 기준인가요?" — project up to 3 candidates.
 */

import type {
  SpatialAnchorCandidateProjection,
  SpatialAnchorEntity,
  SpatialAnchorResolved,
  SpatialAnchorResolveAmbiguous,
  SpatialAnchorResolveOk,
  SpatialDiscoveryIntent,
  SpatialEntityResolverResult,
} from "@/lib/spatial-retrieval/types";

export type SpatialAnchorCandidate = {
  readonly entityId: string;
  readonly titleKo: string;
  readonly kind: string;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly selected?: boolean;
  readonly contextAnchor?: boolean;
  readonly recentInteraction?: boolean;
};

const NL_STRONG = 40;
const NL_MIN = 12;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function kindMatchesAnchor(
  kind: string,
  anchor: SpatialAnchorEntity,
): boolean {
  const k = kind.toLowerCase();
  if (anchor === "hotel") {
    return k === "hotel" || k === "lodging";
  }
  if (anchor === "attraction") {
    return k === "attraction" || k === "poi" || k === "place";
  }
  if (anchor === "station") {
    return k === "station" || k === "amenity";
  }
  if (anchor === "place") return true;
  if (anchor === "user_location") return false;
  return k === anchor;
}

function displayLabel(
  titleKo: string,
  anchorType: SpatialAnchorEntity,
): string {
  const t = titleKo.trim();
  if (
    /namba|난바/i.test(t) &&
    (/hotel|호텔/i.test(t) || anchorType === "hotel")
  ) {
    return "Namba Hotel";
  }
  return t || "Anchor";
}

function nlMatchScore(titleKo: string, rawText: string): number {
  const title = normalize(titleKo);
  const raw = normalize(rawText);
  let score = 0;
  if (/namba|난바/.test(raw) && /namba|난바/.test(title)) score += 40;
  if (/umeda|우메다/.test(raw) && /umeda|우메다/.test(title)) score += 40;
  if (/doton|도톤/.test(raw) && /doton|도톤/.test(title)) score += 40;
  if (/usj|유니버설/.test(raw) && /usj|universal|유니버설/.test(title)) {
    score += 40;
  }
  const tokens = raw.match(/[a-z0-9가-힣]{2,}/g) ?? [];
  for (const tok of tokens) {
    if (/호텔|숙소|근처|주변|맛집|찾아|기준|기반|보여/.test(tok)) continue;
    if (title.includes(tok)) score += 12;
  }
  return score;
}

function toResolved(
  c: SpatialAnchorCandidate,
  intent: SpatialDiscoveryIntent,
): SpatialAnchorResolved {
  return {
    entityId: c.entityId,
    titleKo: c.titleKo,
    labelKo: displayLabel(c.titleKo, intent.anchorEntity),
    kind: intent.anchorEntity,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
  };
}

export function toEntityResolverResult(input: {
  readonly anchor: SpatialAnchorResolved;
  readonly contextId: string;
}): SpatialEntityResolverResult {
  return {
    anchorId: input.anchor.entityId,
    type: input.anchor.kind,
    location: {
      lat: input.anchor.lat,
      lng: input.anchor.lng,
    },
    contextId: input.contextId,
  };
}

function toCandidateProjection(
  c: SpatialAnchorCandidate,
): SpatialAnchorCandidateProjection {
  return {
    entityId: c.entityId,
    titleKo: c.titleKo,
    type: c.kind,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    pinRole: "anchor_candidate",
  };
}

function filterByKind(
  candidates: readonly SpatialAnchorCandidate[],
  anchorType: SpatialAnchorEntity,
): SpatialAnchorCandidate[] {
  return candidates.filter((c) => kindMatchesAnchor(c.kind, anchorType));
}

function pickBestNl(
  pool: readonly SpatialAnchorCandidate[],
  intent: SpatialDiscoveryIntent,
): { candidate: SpatialAnchorCandidate; score: number } | null {
  let best: SpatialAnchorCandidate | null = null;
  let bestScore = -1;
  let second = -1;
  for (const c of pool) {
    const s = nlMatchScore(c.titleKo, intent.rawText);
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = c;
    } else if (s > second) {
      second = s;
    }
  }
  if (!best || bestScore < NL_MIN) return null;
  // Tie / ambiguous NL — treat as unresolved if top two within 8
  if (second >= NL_MIN && bestScore - second < 8) return null;
  return { candidate: best, score: bestScore };
}

function ok(
  candidate: SpatialAnchorCandidate,
  intent: SpatialDiscoveryIntent,
  contextId: string,
  source: SpatialAnchorResolveOk["source"],
): SpatialAnchorResolveOk {
  const anchor = toResolved(candidate, intent);
  return {
    ok: true,
    anchor,
    source,
    resolver: toEntityResolverResult({ anchor, contextId }),
  };
}

function ambiguous(
  pool: readonly SpatialAnchorCandidate[],
  all: readonly SpatialAnchorCandidate[],
  reason: "ambiguous" | "not_found",
): SpatialAnchorResolveAmbiguous {
  const source = pool.length > 0 ? pool : all;
  return {
    ok: false,
    reason,
    candidates: source.slice(0, 3).map(toCandidateProjection),
    askUser: false,
  };
}

/**
 * Strong NL naming a different entity overrides soft priority flags.
 */
function nlOverrides(
  flagged: SpatialAnchorCandidate,
  nl: { candidate: SpatialAnchorCandidate; score: number } | null,
  intent: SpatialDiscoveryIntent,
): boolean {
  if (!nl) return false;
  if (nl.candidate.entityId === flagged.entityId) return false;
  if (nl.score < NL_STRONG) return false;
  return nlMatchScore(flagged.titleKo, intent.rawText) < 20;
}

/**
 * Resolve Anchor with locked priority. Never chat-asks the user.
 */
export function resolveSpatialAnchorDetailed(input: {
  readonly intent: SpatialDiscoveryIntent;
  readonly contextId: string;
  readonly candidates?: readonly SpatialAnchorCandidate[];
}): SpatialAnchorResolveOk | SpatialAnchorResolveAmbiguous {
  const intent = input.intent;
  const contextId = input.contextId.trim() || "context";
  const all = input.candidates ?? [];

  if (intent.anchorEntity === "user_location") {
    const anchor: SpatialAnchorResolved = {
      entityId: "anchor_user_location",
      titleKo: "내 위치",
      labelKo: "내 위치",
      kind: "user_location",
      lat: null,
      lng: null,
    };
    return {
      ok: true,
      anchor,
      source: "selected",
      resolver: toEntityResolverResult({ anchor, contextId }),
    };
  }

  const pool = filterByKind(all, intent.anchorEntity);
  const nl = pickBestNl(pool, intent);

  // 1. Currently selected Entity
  const selected = pool.find((c) => c.selected === true);
  if (selected && !nlOverrides(selected, nl, intent)) {
    return ok(selected, intent, contextId, "selected");
  }

  // 2. Context Anchor
  const contextAnchor = pool.find((c) => c.contextAnchor === true);
  if (contextAnchor && !nlOverrides(contextAnchor, nl, intent)) {
    return ok(contextAnchor, intent, contextId, "context_anchor");
  }

  // 3. Recent Interaction Entity
  const recent = pool.find((c) => c.recentInteraction === true);
  if (recent && !nlOverrides(recent, nl, intent)) {
    return ok(recent, intent, contextId, "recent_interaction");
  }

  // 4. Natural Language Entity Matching
  if (nl) {
    return ok(nl.candidate, intent, contextId, "nl_match");
  }

  // Fallback seed when pool empty but NL names known landmark
  if (
    pool.length === 0 &&
    intent.anchorEntity === "hotel" &&
    /난바|namba/iu.test(intent.rawText)
  ) {
    const seed: SpatialAnchorCandidate = {
      entityId: "ent_namba_hotel",
      titleKo: "Namba Hotel",
      kind: "hotel",
      lat: 34.6654,
      lng: 135.501,
    };
    return ok(seed, intent, contextId, "fallback_seed");
  }

  if (
    pool.length === 0 &&
    intent.anchorEntity === "attraction" &&
    /USJ|유니버설/iu.test(intent.rawText)
  ) {
    const seed: SpatialAnchorCandidate = {
      entityId: "ent_usj",
      titleKo: "USJ",
      kind: "attraction",
      lat: 34.6654,
      lng: 135.4323,
    };
    return ok(seed, intent, contextId, "fallback_seed");
  }

  // Failure → project ≤3 candidates (never AI question)
  return ambiguous(
    pool,
    all,
    pool.length > 1 ? "ambiguous" : "not_found",
  );
}

/**
 * Thin wrapper — resolved anchor or null.
 * Prefer resolveSpatialAnchorDetailed for ambiguous projections.
 */
export function resolveSpatialAnchor(input: {
  readonly intent: SpatialDiscoveryIntent;
  readonly candidates?: readonly SpatialAnchorCandidate[];
  readonly contextId?: string;
}): SpatialAnchorResolved | null {
  const detailed = resolveSpatialAnchorDetailed({
    intent: input.intent,
    contextId: input.contextId ?? "context",
    candidates: input.candidates,
  });
  return detailed.ok ? detailed.anchor : null;
}

/** Map ambiguous result → Workspace Projection pins (candidate role). */
export function projectAnchorCandidates(
  candidates: readonly SpatialAnchorCandidateProjection[],
): readonly {
  readonly entityId: string;
  readonly titleKo: string;
  readonly kind: string;
  readonly lat: number;
  readonly lng: number;
  readonly role: "anchor_candidate";
}[] {
  return candidates
    .filter((c) => c.lat != null && c.lng != null)
    .slice(0, 3)
    .map((c) => ({
      entityId: c.entityId,
      titleKo: c.titleKo,
      kind: c.type,
      lat: c.lat as number,
      lng: c.lng as number,
      role: "anchor_candidate" as const,
    }));
}
