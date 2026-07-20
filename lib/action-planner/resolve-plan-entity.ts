/**
 * Entity Resolver bridge for Action Planner — catalog label before tool lookup.
 */

import {
  entitiesImplyEatery,
  entitiesImplyLodging,
  findLodgingEntity,
  resolveEntities,
} from "@/lib/entity-resolver";
import type { PlannerLookupDomain } from "@/lib/rule-engine/resolve-tool-id";
import { resolveLookupToolId } from "@/lib/rule-engine/resolve-tool-id";
import type { RimvioToolId } from "@/lib/tool-registry";
import { isAmenityLookupQuery } from "@/lib/tool-registry/amenity-lookup-cue";

export type PlanEntityResolve = {
  readonly labelKo: string;
  /** Query string for hotel.lookup / restaurant.lookup. */
  readonly queryKo: string;
  readonly domain: PlannerLookupDomain;
  readonly toolId: RimvioToolId;
  readonly catalogHit: boolean;
};

/**
 * Resolve a compare-side label via catalog Entity Resolver.
 * Falls back to raw text + lodging lookup (travel MVP).
 */
export function resolvePlanEntityLabel(raw: string): PlanEntityResolve {
  const text = raw.trim();
  const resolved = resolveEntities(text);
  const lodging = findLodgingEntity(resolved.entities);
  if (lodging || entitiesImplyLodging(resolved.entities)) {
    const entity = lodging ?? resolved.entities[0]!;
    const labelKo = entity.label.trim() || text;
    const queryKo = entity.queryFocus?.trim() || labelKo;
    return {
      labelKo,
      queryKo,
      domain: "lodging",
      toolId: resolveLookupToolId("lodging"),
      catalogHit: true,
    };
  }
  if (entitiesImplyEatery(resolved.entities)) {
    const entity = resolved.entities[0]!;
    const labelKo = entity.label.trim() || text;
    const queryKo = entity.queryFocus?.trim() || labelKo;
    return {
      labelKo,
      queryKo,
      domain: "eatery",
      toolId: resolveLookupToolId("eatery"),
      catalogHit: true,
    };
  }
  if (isAmenityLookupQuery(text)) {
    return {
      labelKo: text,
      queryKo: text,
      domain: "amenity",
      toolId: resolveLookupToolId("amenity", text),
      catalogHit: false,
    };
  }
  return {
    labelKo: text,
    queryKo: text,
    domain: "lodging",
    toolId: resolveLookupToolId("lodging"),
    catalogHit: false,
  };
}
