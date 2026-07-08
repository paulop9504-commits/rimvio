/**
 * Helpers — lift committed ContextResources into rank / MAIN preference.
 * Inventory remains Hub browse fodder; Commit files win MAIN when present.
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import type {
  ContextHubServiceId,
  ContextHubServiceRow,
} from "@/lib/globe/context-hub/context-hub-service-catalog";
import { readCommittedContextResources } from "@/lib/globe/resource/emit-committed-context-resource";
import type { RankedContextResource } from "@/lib/globe/resource/map-hub-service-to-resource";
import type { ContextResource } from "@/lib/globe/resource/types";

/** MAIN preference over browse inventory once Reality Commit wrote the file. */
export const COMMITTED_RESOURCE_RANK_BOOST = 220;

function stubHubRow(resource: ContextResource): ContextHubServiceRow {
  return {
    serviceId: (resource.sourceHubId as ContextHubServiceId) || "flight",
    labelKo: resource.label,
    shortLabelKo: resource.shortLabel ?? resource.label,
    implemented: true,
    offered: true,
    connected: true,
    link: null,
    flightOptions: [],
    handoffHref: null,
    handoffLabelKo: null,
  };
}

export function committedResourceIdSet(
  event: EventCandidate | null | undefined,
): Set<string> {
  return new Set(
    readCommittedContextResources(event).map((row) => row.resourceId),
  );
}

/** Append committed rows missing from inventory-derived lists (e.g. flight). */
export function mergeCommittedIntoRanked(input: {
  event: EventCandidate;
  ranked: RankedContextResource[];
  services: readonly ContextHubServiceRow[];
  scoreFor: (resource: ContextResource, hubRow: ContextHubServiceRow) => number;
}): RankedContextResource[] {
  const byId = new Map(
    input.ranked.map((entry) => [entry.resource.resourceId, entry] as const),
  );
  const committed = readCommittedContextResources(input.event);

  for (const resource of committed) {
    const existing = byId.get(resource.resourceId);
    if (existing) {
      byId.set(resource.resourceId, {
        ...existing,
        resource: {
          ...existing.resource,
          ...resource,
          metadata: {
            ...(existing.resource.metadata ?? {}),
            ...(resource.metadata ?? {}),
            committed: true,
          },
        },
        rankScore: existing.rankScore + COMMITTED_RESOURCE_RANK_BOOST,
      });
      continue;
    }

    const hubRow =
      input.services.find((row) => row.serviceId === resource.sourceHubId) ??
      stubHubRow(resource);

    byId.set(resource.resourceId, {
      resource: {
        ...resource,
        metadata: { ...(resource.metadata ?? {}), committed: true },
      },
      hubRow,
      rankScore:
        input.scoreFor(resource, hubRow) + COMMITTED_RESOURCE_RANK_BOOST,
    });
  }

  return [...byId.values()];
}
