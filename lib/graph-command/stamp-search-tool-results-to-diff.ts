/**
 * Search Tool → Globe Diff — session graph is applied by caller;
 * this stamps lastBatch so pin-bar / home Diff share the same working set.
 * No Feed gate (Cursor Diff law).
 */

import {
  writeContextConditionLastBatch,
  type ContextConditionLastBatchWire,
} from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import type { GraphEntityDomain } from "@/lib/graph-command/types";
import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";
import type { ToolInvokeInput } from "@/lib/tool-registry/invoke-rimvio-tool";

export type SearchToolCandidate = NonNullable<ToolInvokeInput["candidates"]>[number];

export const TOOL_SEARCH_BATCH_ID_PREFIX = "tool-search:";

/** True when lastBatch came from Tool Registry Search Diff (not Field scout). */
export function isToolSearchLastBatch(
  batch: Pick<ContextConditionLastBatchWire, "batchId"> | null | undefined,
): boolean {
  return Boolean(batch?.batchId?.startsWith(TOOL_SEARCH_BATCH_ID_PREFIX));
}

/**
 * Field scout inventory owns lodging map markers — hide stale Graph APA lodging.
 * Tool-search Diff and Workspace Commit must NOT steal graph lodging markers.
 */
export function fieldScoutOwnsLodgingGraphMarkers(
  batch: ContextConditionLastBatchWire | null | undefined,
): boolean {
  if (!batch?.recommendations?.some((row) => row.kind === "lodging")) {
    return false;
  }
  if (isToolSearchLastBatch(batch)) {
    return false;
  }
  if (batch.batchId?.startsWith("workspace-commit:")) {
    return false;
  }
  return true;
}

function placeIdFromCandidate(candidate: SearchToolCandidate): string {
  const id = candidate.id.trim();
  if (id.startsWith("maps:")) {
    return id.slice("maps:".length);
  }
  if (id.startsWith("liteapi:")) {
    return id.slice("liteapi:".length);
  }
  return id || candidate.labelKo.trim();
}

function batchKindForDomain(
  domain: GraphEntityDomain,
): NonNullable<ContextConditionLastBatchWire["recommendations"]>[number]["kind"] {
  if (domain === "lodging") {
    return "lodging";
  }
  if (domain === "eatery") {
    return "eatery";
  }
  return "amenity";
}

/** Tool candidates → PlaceSearchHit for mergeSearchProjectIntoGraph. */
export function toolCandidatesToPlaceHits(
  domain: GraphEntityDomain,
  candidates: readonly SearchToolCandidate[] | null | undefined,
): PlaceSearchHit[] {
  return (candidates ?? []).map((c) => ({
    id: c.id,
    labelKo: c.labelKo,
    domain,
    lat: typeof c.lat === "number" && Number.isFinite(c.lat) ? c.lat : 0,
    lng: typeof c.lng === "number" && Number.isFinite(c.lng) ? c.lng : 0,
    rating: c.rating ?? null,
    walkMinutes: c.walkMinutes ?? null,
    priceBand: c.priceBand ?? null,
    reservable: c.reservable ?? false,
    localFavorite: c.localFavorite ?? false,
    source:
      c.source === "liteapi" ||
      c.source === "maps" ||
      c.source === "seed" ||
      c.source === "review" ||
      c.source === "booking"
        ? c.source
        : "maps",
    liteapiOfferId: c.liteapiOfferId ?? null,
    liteapiHotelId: c.liteapiHotelId ?? null,
    amountLabel: c.amountLabel ?? null,
    reviewCount: c.reviewCount ?? null,
    priceKrw: c.priceKrw ?? null,
  }));
}

/**
 * Map-first Diff SSOT — write lastBatch from Tool Registry search results.
 * Does not publish scout Feed gate.
 */
export function stampSearchToolResultsToDiff(input: {
  readonly contextEventId: string;
  readonly domain: GraphEntityDomain;
  readonly query: string;
  readonly candidates: readonly SearchToolCandidate[] | null | undefined;
  readonly summaryKo?: string | null;
  /** Planner Diff bundle — one lastBatch id for multi-lookup. */
  readonly batchId?: string | null;
}): ContextConditionLastBatchWire {
  const contextEventId = input.contextEventId.trim();
  const kind = batchKindForDomain(input.domain);
  const recommendations = (input.candidates ?? []).slice(0, 16).map((c) => ({
    kind,
    title: c.labelKo,
    reasonKo: "검색",
    placeId: placeIdFromCandidate(c),
    lat: typeof c.lat === "number" && Number.isFinite(c.lat) ? c.lat : undefined,
    lng: typeof c.lng === "number" && Number.isFinite(c.lng) ? c.lng : undefined,
  }));

  const batchId =
    input.batchId?.trim() ||
    `${TOOL_SEARCH_BATCH_ID_PREFIX}${contextEventId}:${Date.now()}`;

  const wire: ContextConditionLastBatchWire = {
    batchId,
    count: recommendations.length,
    summaryKo:
      input.summaryKo?.trim() ||
      (recommendations.length > 0
        ? `${recommendations.length}곳 맞춰 봤어요`
        : "검색 결과가 없어요"),
    atIso: new Date().toISOString(),
    triggerMessage: input.query.trim() || undefined,
    recommendations,
  };

  if (contextEventId) {
    writeContextConditionLastBatch(contextEventId, wire);
  }
  return wire;
}
