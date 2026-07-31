/**
 * Load Place Brief: facts immediately, optional LLM enrich with cache.
 */

import { buildPlaceBriefFactPack, buildPlaceBriefFromFacts } from "@/lib/context-workspace/place-brief/build-place-brief-from-facts";
import { enrichPlaceBriefWithLlm } from "@/lib/context-workspace/place-brief/enrich-place-brief-llm";
import {
  readPlaceBriefCache,
  writePlaceBriefCache,
} from "@/lib/context-workspace/place-brief/place-brief-cache";
import type { PlaceBrief } from "@/lib/context-workspace/place-brief/types";
import type { ContextWorkspaceNode } from "@/lib/context-workspace/types";
import type { ContextLodgingInventoryRow } from "@/lib/globe/context-hub/lodging-resource-types";
import { findLodgingInventoryRowByPlaceId } from "@/lib/context-workspace/ensure-lodging-inventory-for-checkout";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export function resolveLodgingInventoryForNode(input: {
  readonly contextEventId: string;
  readonly node: ContextWorkspaceNode;
}): ContextLodgingInventoryRow | null {
  const event = findLifeEventCandidate(input.contextEventId.trim());
  if (!event) return null;
  const placeId = (input.node.placeId || input.node.id).trim();
  return findLodgingInventoryRowByPlaceId(
    readLodgingInventoryRows(event),
    placeId,
  );
}

export function buildImmediatePlaceBrief(input: {
  readonly contextEventId: string;
  readonly node: ContextWorkspaceNode;
  readonly destinationKo?: string | null;
}): PlaceBrief {
  const placeId = (input.node.placeId || input.node.id).trim();
  const cached = readPlaceBriefCache(placeId);
  if (cached) return cached;

  const inventory = resolveLodgingInventoryForNode({
    contextEventId: input.contextEventId,
    node: input.node,
  });
  const pack = buildPlaceBriefFactPack({
    node: input.node,
    inventory,
    destinationKo: input.destinationKo,
  });
  const brief = buildPlaceBriefFromFacts(pack);
  writePlaceBriefCache(brief);
  return brief;
}

export async function loadPlaceBriefAsync(input: {
  readonly contextEventId: string;
  readonly node: ContextWorkspaceNode;
  readonly destinationKo?: string | null;
  readonly allowLlm?: boolean;
}): Promise<PlaceBrief> {
  const inventory = resolveLodgingInventoryForNode({
    contextEventId: input.contextEventId,
    node: input.node,
  });
  const pack = buildPlaceBriefFactPack({
    node: input.node,
    inventory,
    destinationKo: input.destinationKo,
  });
  const base = buildPlaceBriefFromFacts(pack);
  const cached = readPlaceBriefCache(pack.placeId);
  if (cached?.source === "facts+llm") {
    return cached;
  }

  if (input.allowLlm === false) {
    writePlaceBriefCache(base);
    return base;
  }

  try {
    const enriched = await enrichPlaceBriefWithLlm({ pack, base });
    writePlaceBriefCache(enriched);
    return enriched;
  } catch {
    writePlaceBriefCache(base);
    return base;
  }
}
