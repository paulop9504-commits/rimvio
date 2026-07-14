import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type { ContextConditionLastBatchWire } from "@/lib/globe/context-condition-ai/context-condition-last-batch-store";
import {
  readActiveDiscoveryExecution,
  writeActiveDiscoveryExecution,
} from "@/lib/globe/discovery-execution/read-active-discovery-execution";

export type MergeDiscoveryRetryResult = {
  readonly merged: ContextConditionLastBatchWire;
  readonly addedCount: number;
  readonly totalCount: number;
};

function placeKey(row: {
  placeId?: string;
  title?: string;
  lat?: number;
  lng?: number;
}): string {
  const id = row.placeId?.trim();
  if (id) {
    return `id:${id}`;
  }
  const title = row.title?.trim() ?? "";
  const lat = row.lat ?? "";
  const lng = row.lng ?? "";
  return `geo:${title}:${lat}:${lng}`;
}

/**
 * Union retry recommendations into the active Discovery/Feed batch.
 * Keeps prior batchId so the feed is not archived away on replan.
 */
export function mergeDiscoveryRetryIntoActiveFeed(input: {
  contextEventId: string;
  incoming: {
    batchId: string;
    summaryKo: string;
    radiusM?: number;
    triggerMessage?: string;
    recommendations: readonly ContextConditionRecommendation[];
    spec?: ContextConditionLastBatchWire["spec"];
  };
  now?: Date;
}): MergeDiscoveryRetryResult {
  const prior = readActiveDiscoveryExecution(input.contextEventId);
  const priorRows = prior?.recommendations ?? [];
  const seen = new Set(priorRows.map((row) => placeKey(row)));
  let addedCount = 0;
  const mergedRows = [...priorRows];

  for (const row of input.incoming.recommendations) {
    const key = placeKey(row);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    mergedRows.push({
      kind: row.kind,
      activitySubtype: row.activitySubtype ?? null,
      title: row.title,
      reasonKo: row.reasonKo,
      placeId: row.placeId,
      lat: row.lat,
      lng: row.lng,
    });
    addedCount += 1;
  }

  const atIso = (input.now ?? new Date()).toISOString();
  const batchId = prior?.batchId?.trim() || input.incoming.batchId;
  const summaryKo =
    addedCount > 0
      ? `${prior?.summaryKo ?? input.incoming.summaryKo} · +${addedCount}`
      : (prior?.summaryKo ?? input.incoming.summaryKo);

  const merged: ContextConditionLastBatchWire = {
    batchId,
    count: mergedRows.length,
    summaryKo,
    atIso,
    triggerMessage:
      input.incoming.triggerMessage ?? prior?.triggerMessage,
    radiusM: input.incoming.radiusM ?? prior?.radiusM,
    spec: input.incoming.spec ?? prior?.spec ?? null,
    recommendations: mergedRows,
  };

  writeActiveDiscoveryExecution(input.contextEventId, merged, {
    archivePrior: false,
  });

  return {
    merged,
    addedCount,
    totalCount: mergedRows.length,
  };
}
