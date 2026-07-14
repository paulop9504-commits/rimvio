/**
 * Recent spatial Entity Resolver anchors for Instant Carry「근처」lanes.
 * Fed from scout `triggerMessage` + personal resume/trigger text at build time.
 */

import {
  pathImpliesLandmark,
  resolveEntities,
  type EntityKind,
  type ResolvedEntity,
} from "@/lib/entity-resolver";

const STORAGE_KEY = "rimvio.instant-carry-entity-anchors.v1";
const MAX_ANCHORS = 8;
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type InstantCarryEntityAnchor = {
  readonly id: string;
  readonly kind: EntityKind;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly queryFocus?: string;
  readonly nearSearch?: boolean;
  readonly lat?: number;
  readonly lng?: number;
  readonly geoId?: string;
  readonly sourceText: string;
  readonly atIso: string;
};

const memoryAnchors: InstantCarryEntityAnchor[] = [];

export function isNearCapableEntity(entity: ResolvedEntity): boolean {
  return (
    entity.kind === "Station" ||
    entity.kind === "Airport" ||
    entity.kind === "Location" ||
    entity.kind === "Museum" ||
    pathImpliesLandmark(entity.semanticPath) ||
    Boolean(entity.nearSearch)
  );
}

function toAnchor(
  entity: ResolvedEntity,
  sourceText: string,
  atIso: string,
): InstantCarryEntityAnchor {
  return {
    id: entity.id,
    kind: entity.kind,
    label: entity.label,
    aliases: entity.aliases,
    queryFocus: entity.queryFocus,
    nearSearch: entity.nearSearch,
    lat: entity.lat,
    lng: entity.lng,
    geoId: entity.geoId,
    sourceText,
    atIso,
  };
}

function readRaw(): InstantCarryEntityAnchor[] {
  if (typeof window === "undefined") {
    return [...memoryAnchors];
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as InstantCarryEntityAnchor[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((row) => row?.id?.trim() && row.label?.trim());
  } catch {
    return [];
  }
}

function writeRaw(rows: readonly InstantCarryEntityAnchor[]): void {
  const next = rows.slice(0, MAX_ANCHORS);
  if (typeof window === "undefined") {
    memoryAnchors.length = 0;
    memoryAnchors.push(...next);
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function readInstantCarryEntityAnchors(
  nowMs = Date.now(),
): InstantCarryEntityAnchor[] {
  return readRaw().filter((row) => {
    const age = nowMs - Date.parse(row.atIso);
    return Number.isFinite(age) && age >= 0 && age <= MAX_AGE_MS;
  });
}

/** Merge near-capable entities from an utterance into the Instant Carry anchor list. */
export function recordInstantCarryAnchorsFromUtterance(message: string): void {
  const text = message.trim();
  if (!text) {
    return;
  }
  const { entities } = resolveEntities(text);
  const near = entities.filter(isNearCapableEntity);
  if (near.length === 0) {
    return;
  }
  const atIso = new Date().toISOString();
  const prior = readInstantCarryEntityAnchors();
  const merged = new Map<string, InstantCarryEntityAnchor>();
  for (const entity of near) {
    merged.set(entity.id, toAnchor(entity, text, atIso));
  }
  for (const row of prior) {
    if (!merged.has(row.id)) {
      merged.set(row.id, row);
    }
  }
  writeRaw([...merged.values()]);
}

/** Test / dismiss helper. */
export function clearInstantCarryEntityAnchors(): void {
  writeRaw([]);
}

export function anchorsToResolvedEntities(
  anchors: readonly InstantCarryEntityAnchor[],
): ResolvedEntity[] {
  return anchors.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: row.label,
    aliases: row.aliases,
    semanticPath: [],
    confidence: 0.9,
    source: "context" as const,
    queryFocus: row.queryFocus,
    nearSearch: row.nearSearch ?? true,
    lat: row.lat,
    lng: row.lng,
    geoId: row.geoId as ResolvedEntity["geoId"],
  }));
}
