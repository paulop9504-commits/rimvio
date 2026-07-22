/**
 * Tool Search → Hub Action Log — work chips / Diff timeline SSOT.
 * Call after stampSearchToolResultsToDiff (registry stays pure).
 */

import type { GraphEntityDomain } from "@/lib/graph-command/types";
import { emitSearchHubAction } from "@/lib/globe/resource/hub-action-record-store";
import type { RimvioToolId } from "@/lib/tool-registry";

function sourceHubIdForDomain(
  domain: GraphEntityDomain | "lodging" | "eatery" | "poi" | "amenity",
): string {
  if (domain === "eatery") {
    return "eatery";
  }
  if (domain === "lodging") {
    return "lodging";
  }
  if (domain === "amenity" || domain === "poi") {
    return "amenity";
  }
  return "lodging";
}

/** Stamp Tool Registry search onto Hub Action Log (chips read this). */
export function emitToolSearchHubAction(input: {
  readonly contextEventId: string;
  readonly toolId: RimvioToolId | string;
  readonly domain: GraphEntityDomain | "lodging" | "eatery" | "poi" | "amenity";
  readonly query: string;
  readonly candidateCount: number;
}): void {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return;
  }
  void emitSearchHubAction({
    contextEventId,
    sourceHubId: sourceHubIdForDomain(input.domain),
    externalRef: input.toolId,
    status: input.candidateCount > 0 ? "success" : "failed",
    payload: {
      query: input.query.trim() || input.toolId,
      filters: {
        toolId: input.toolId,
        candidateCount: input.candidateCount,
      },
    },
  });
}
