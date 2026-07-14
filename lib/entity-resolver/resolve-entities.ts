/**
 * Entity Resolver SSOT — Tokenizer → NER → Alias → KG → Type → Context.
 * Dictionary-first; never LLM for catalog brands / stations / landmarks.
 */

import { normalizeScoutUtterance } from "@/lib/entity-resolver/normalize-scout-utterance";
import { resolveBrandEntities } from "@/lib/entity-resolver/adapters/food-brand";
import { resolveCuisineEntities } from "@/lib/entity-resolver/adapters/cuisine";
import { resolveLockEntities } from "@/lib/entity-resolver/adapters/entity-lock";
import { enrichGeoFromRealityGraph } from "@/lib/entity-resolver/adapters/world-geo";
import { resolveDictionaryCatalogEntities } from "@/lib/entity-resolver/catalogs";
import {
  entityPathImpliesEatery,
  pathImpliesAmenity,
  pathImpliesLandmark,
  pathImpliesLodging,
  pathImpliesRetail,
} from "@/lib/entity-resolver/semantic-layer";
import type {
  EntityResolveResult,
  ResolvedEntity,
} from "@/lib/entity-resolver/types";

const MODIFIER_PATTERN =
  /근처|주변|near|around|찾아\s*줘|찾아줘|해\s*줘|좀|추천|검색/giu;

function spansOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

function dedupeEntities(entities: readonly ResolvedEntity[]): ResolvedEntity[] {
  const sorted = [...entities].sort((left, right) => {
    const ls = left.span?.start ?? 0;
    const rs = right.span?.start ?? 0;
    if (ls !== rs) {
      return ls - rs;
    }
    return right.confidence - left.confidence;
  });
  const picked: ResolvedEntity[] = [];
  for (const row of sorted) {
    if (!row.span) {
      picked.push(row);
      continue;
    }
    const clash = picked.find(
      (prior) =>
        prior.span &&
        spansOverlap(prior.span, row.span!) &&
        prior.kind === row.kind,
    );
    if (clash) {
      if (row.confidence > clash.confidence) {
        picked[picked.indexOf(clash)] = row;
      }
      continue;
    }
    picked.push(row);
  }
  return picked.sort(
    (a, b) => (a.span?.start ?? 0) - (b.span?.start ?? 0),
  );
}

function applyNearSearchContext(
  text: string,
  entities: readonly ResolvedEntity[],
): ResolvedEntity[] {
  const nearCue = /근처|주변|near|around/iu.test(text);
  if (!nearCue) {
    return [...entities];
  }
  return entities.map((row) =>
    row.kind === "Station" ||
    row.kind === "Airport" ||
    row.kind === "Location" ||
    row.kind === "Museum" ||
    pathImpliesLandmark(row.semanticPath)
      ? { ...row, nearSearch: true }
      : row,
  );
}

function extractModifiers(text: string): string[] {
  const hits = text.match(MODIFIER_PATTERN) ?? [];
  return [...new Set(hits.map((row) => row.trim()).filter(Boolean))];
}

/** Public SSOT — resolve utterance to typed entities before Intent. */
export function resolveEntities(message: string): EntityResolveResult {
  const text = normalizeScoutUtterance(message);
  if (!text) {
    return { text: "", entities: [], modifiers: [] };
  }

  const ner = [
    ...resolveBrandEntities(text),
    ...resolveCuisineEntities(text),
    ...resolveDictionaryCatalogEntities(text),
    ...resolveLockEntities(text),
  ];

  const withGeo = enrichGeoFromRealityGraph(text, ner);
  const withContext = applyNearSearchContext(text, withGeo);
  const entities = dedupeEntities(withContext);

  return {
    text,
    entities,
    modifiers: extractModifiers(text),
  };
}

export function entitiesImplyEatery(
  entities: readonly ResolvedEntity[],
): boolean {
  return entities.some((row) => {
    if (pathImpliesRetail(row.semanticPath) || pathImpliesLodging(row.semanticPath)) {
      return false;
    }
    return (
      row.kind === "Food" ||
      row.kind === "Drink" ||
      row.kind === "Dessert" ||
      row.kind === "Restaurant" ||
      (row.kind === "Brand" && entityPathImpliesEatery(row.semanticPath)) ||
      entityPathImpliesEatery(row.semanticPath)
    );
  });
}

export function entitiesImplyLodging(
  entities: readonly ResolvedEntity[],
): boolean {
  return entities.some(
    (row) =>
      row.kind === "Hotel" || pathImpliesLodging(row.semanticPath),
  );
}

export function entitiesImplyAmenity(
  entities: readonly ResolvedEntity[],
): boolean {
  return entities.some(
    (row) =>
      pathImpliesAmenity(row.semanticPath) ||
      pathImpliesRetail(row.semanticPath),
  );
}

export function entitiesImplyLandmark(
  entities: readonly ResolvedEntity[],
): boolean {
  return entities.some(
    (row) =>
      pathImpliesLandmark(row.semanticPath) ||
      row.kind === "Museum",
  );
}

export function findStationEntity(
  entities: readonly ResolvedEntity[],
): ResolvedEntity | null {
  return (
    entities.find((row) => row.kind === "Station" && row.geoId) ??
    entities.find((row) => row.kind === "Station") ??
    null
  );
}

export function findAirportEntity(
  entities: readonly ResolvedEntity[],
): ResolvedEntity | null {
  return (
    entities.find((row) => row.kind === "Airport" && row.geoId) ??
    entities.find((row) => row.kind === "Airport") ??
    null
  );
}

export function findLandmarkEntity(
  entities: readonly ResolvedEntity[],
): ResolvedEntity | null {
  return (
    entities.find(
      (row) => pathImpliesLandmark(row.semanticPath) && row.geoId,
    ) ??
    entities.find((row) => pathImpliesLandmark(row.semanticPath)) ??
    entities.find((row) => row.kind === "Museum") ??
    null
  );
}

export function findBrandEntity(
  entities: readonly ResolvedEntity[],
): ResolvedEntity | null {
  // Prefer food eatery brands over retail brands for dish focus.
  return (
    entities.find(
      (row) =>
        row.kind === "Brand" && entityPathImpliesEatery(row.semanticPath),
    ) ??
    entities.find((row) => row.kind === "Brand") ??
    null
  );
}

export function findLodgingEntity(
  entities: readonly ResolvedEntity[],
): ResolvedEntity | null {
  return (
    entities.find((row) => row.kind === "Hotel") ??
    entities.find((row) => pathImpliesLodging(row.semanticPath)) ??
    null
  );
}

export function findDishEntity(
  entities: readonly ResolvedEntity[],
): ResolvedEntity | null {
  return (
    entities.find((row) => row.kind === "Dessert") ??
    entities.find((row) => row.kind === "Food") ??
    entities.find(
      (row) => row.kind === "Drink" && row.id.startsWith("cuisine:"),
    ) ??
    null
  );
}

/** Scout focus string (eatery brand > dish; lodging brand separate). */
export function queryFocusFromEntities(
  entities: readonly ResolvedEntity[],
): string | null {
  const brand = findBrandEntity(entities);
  if (brand?.queryFocus && entityPathImpliesEatery(brand.semanticPath)) {
    return brand.queryFocus;
  }
  const dish = findDishEntity(entities);
  return dish?.queryFocus?.trim() || null;
}

/** Spatial origin candidate: Station > Airport > Landmark. */
export function findSpatialOriginEntity(
  entities: readonly ResolvedEntity[],
): ResolvedEntity | null {
  return (
    findStationEntity(entities) ??
    findAirportEntity(entities) ??
    findLandmarkEntity(entities) ??
    null
  );
}
