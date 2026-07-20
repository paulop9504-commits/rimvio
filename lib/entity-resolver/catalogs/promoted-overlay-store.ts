/**
 * Runtime promoted catalog overlay — local Dictionary soft layer.
 * Never writes seed source files (humans commit those via PR / dump).
 */

import type { EntityCatalogEntry } from "@/lib/entity-resolver/catalogs/catalog-types";

const STORAGE_KEY = "rimvio.entity.promoted-overlay.v1";
const EVENT_NAME = "rimvio-promoted-catalog-overlay";

type OverlayWire = {
  readonly version: 1;
  readonly entries: readonly EntityCatalogEntryWire[];
};

/** RegExp is not JSON-serializable — store patternSource. */
type EntityCatalogEntryWire = {
  readonly id: string;
  readonly labelKo: string;
  readonly queryKo: string;
  readonly kind: EntityCatalogEntry["kind"];
  readonly patternSource: string;
  readonly aliases: readonly string[];
  readonly semanticPath: readonly string[];
  readonly confidence?: number;
};

let memory: EntityCatalogEntry[] = [];
let hydrated = false;

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function toWire(entry: EntityCatalogEntry): EntityCatalogEntryWire {
  return {
    id: entry.id,
    labelKo: entry.labelKo,
    queryKo: entry.queryKo,
    kind: entry.kind,
    patternSource: entry.pattern.source,
    aliases: entry.aliases,
    semanticPath: entry.semanticPath,
    confidence: entry.confidence,
  };
}

function fromWire(row: EntityCatalogEntryWire): EntityCatalogEntry | null {
  const source = row.patternSource?.trim();
  if (!source || !row.id || !row.labelKo) {
    return null;
  }
  try {
    return {
      id: row.id,
      labelKo: row.labelKo,
      queryKo: row.queryKo || row.labelKo,
      kind: row.kind,
      pattern: new RegExp(source, "iu"),
      aliases: row.aliases ?? [],
      semanticPath: row.semanticPath ?? [],
      confidence: row.confidence ?? 0.88,
    };
  } catch {
    return null;
  }
}

function persist(): void {
  if (typeof window === "undefined") {
    return;
  }
  const wire: OverlayWire = {
    version: 1,
    entries: memory.map(toWire),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wire));
  } catch {
    // quota / private mode
  }
  emit();
}

function hydrate(): void {
  if (hydrated) {
    return;
  }
  hydrated = true;
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as OverlayWire;
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) {
      return;
    }
    memory = parsed.entries
      .map(fromWire)
      .filter((row): row is EntityCatalogEntry => Boolean(row));
  } catch {
    memory = [];
  }
}

export function readPromotedCatalogOverlay(): readonly EntityCatalogEntry[] {
  hydrate();
  return memory;
}

export function upsertPromotedCatalogEntries(
  entries: readonly EntityCatalogEntry[],
): number {
  hydrate();
  let added = 0;
  const next = [...memory];
  for (const entry of entries) {
    const idx = next.findIndex(
      (row) =>
        row.id === entry.id ||
        row.labelKo.toLowerCase() === entry.labelKo.toLowerCase(),
    );
    if (idx >= 0) {
      next[idx] = entry;
    } else {
      next.push(entry);
      added += 1;
    }
  }
  memory = next;
  persist();
  return added;
}

export function clearPromotedCatalogOverlay(): void {
  memory = [];
  hydrated = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  emit();
}

export function resetPromotedCatalogOverlayForTests(): void {
  memory = [];
  hydrated = true;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
