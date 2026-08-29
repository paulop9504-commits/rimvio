/**
 * Agent decision — spawn Reality Task when verification signals low confidence (R7).
 */

import type { RimvioToolId } from "@/lib/tool-registry";
import type { ToolInvokeResult } from "@/lib/tool-registry";
import type { RealityTask } from "@/lib/reality-data-network/types";
import { spawnLodgingPhotoTasksForCandidates } from "@/lib/reality-data-network/lodging-reality-task";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";

export type SpawnRealityTaskDecision =
  | { readonly type: "none"; readonly reason: string }
  | {
      readonly type: "spawn_reality_task";
      readonly tasks: readonly RealityTask[];
      readonly reason: string;
    };

function toolCandidateToLodgingRow(
  candidate: NonNullable<ToolInvokeResult["candidates"]>[number],
): ContextLodgingInventoryRow {
  const images =
    candidate.images?.filter((u): u is string => Boolean(u)) ??
    (candidate.thumbnailUrl ? [candidate.thumbnailUrl] : []);
  return {
    placeId: candidate.id,
    name: candidate.labelKo,
    lat: candidate.lat ?? 0,
    lng: candidate.lng ?? 0,
    address: null,
    mapsUrl: null,
    provider: candidate.liteapiHotelId ? "liteapi" : "google_places",
    priceKrw: candidate.priceKrw ?? null,
    images,
    photoConfidence:
      candidate.liteapiHotelId ? "exact_place_id" : "nearby_identity",
    photoSource: null,
    stayWindow: null,
    roomOffers: [],
    liteapiHotelId: candidate.liteapiHotelId ?? null,
    rating: candidate.rating ?? null,
    reviewCount: candidate.reviewCount ?? null,
  };
}

/** After hotel.lookup — spawn photo_authenticity tasks for weak-confidence rows. */
export function decideSpawnRealityTaskFromTool(input: {
  readonly toolId: RimvioToolId;
  readonly tool: ToolInvokeResult;
  readonly contextEventId?: string | null;
  readonly verified: boolean;
}): SpawnRealityTaskDecision {
  if (input.toolId !== "hotel.lookup") {
    return { type: "none", reason: "not_lodging_lookup" };
  }

  if (input.verified) {
    return { type: "none", reason: "verification_passed" };
  }

  const candidates = input.tool.candidates ?? [];
  if (candidates.length === 0) {
    return { type: "none", reason: "empty_candidates" };
  }

  const rows = candidates.slice(0, 5).map(toolCandidateToLodgingRow);
  const spawnResults = spawnLodgingPhotoTasksForCandidates({
    rows,
    contextEventId: input.contextEventId,
    maxSpawn: 2,
  });

  const tasks = spawnResults.filter((r) => r.spawned && r.task).map((r) => r.task!);
  if (tasks.length === 0) {
    return { type: "none", reason: "no_weak_photo_rows" };
  }

  return {
    type: "spawn_reality_task",
    tasks,
    reason: "low_photo_confidence",
  };
}
