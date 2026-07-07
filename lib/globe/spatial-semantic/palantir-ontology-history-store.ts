import type { GlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import { readGlobeProjectionLayerPolicy } from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import {
  publishFocusGlobeProjection,
  publishGlobeProjectionLayerPolicy,
} from "@/lib/globe/spatial-semantic/globe-projection-layer-policy";
import {
  publishGeoOntologyFacetState,
  publishGeoOntologyGraph,
  readGeoOntologyFacetState,
  readGeoOntologyGraph,
} from "@/lib/globe/spatial-semantic/geo-ontology-graph-store";
import type { PalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-operator";
import { publishPalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-store";
import { readPalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-store";
import type {
  GeoOntologyFacetState,
  GeoOntologyGraph,
} from "@/lib/globe/spatial-semantic/types";

const HISTORY_EVENT = "rimvio-palantir-ontology-history";
const HISTORY_STORAGE_PREFIX = "rimvio.palantir-ontology-head.";
const MAX_ENTRIES_PER_CONTEXT = 16;

export type PalantirOntologyHistoryKind =
  | "scout"
  | "facet_refine"
  | "place_override"
  | "commit";

export type PalantirOntologyHistoryEntry = {
  readonly id: string;
  readonly contextEventId: string;
  readonly kind: PalantirOntologyHistoryKind;
  readonly atIso: string;
  readonly labelKo: string;
  readonly graph: GeoOntologyGraph | null;
  readonly facet: GeoOntologyFacetState;
  readonly workspace: PalantirWorkspaceSnapshot | null;
  readonly projection: GlobeProjectionLayerPolicy;
};

const histories = new Map<string, PalantirOntologyHistoryEntry[]>();

function emit(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ contextEventId: string }>(HISTORY_EVENT, {
      detail: { contextEventId },
    }),
  );
}

function captureProjection(): GlobeProjectionLayerPolicy {
  const current = readGlobeProjectionLayerPolicy();
  return {
    mode: current.mode,
    activeContextEventId: current.activeContextEventId,
    visiblePlaceIds: [...current.visiblePlaceIds],
  };
}

function historyStorageKey(contextEventId: string): string {
  return `${HISTORY_STORAGE_PREFIX}${contextEventId.trim()}`;
}

function persistPalantirOntologyHistoryHead(
  entry: PalantirOntologyHistoryEntry,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(
      historyStorageKey(entry.contextEventId),
      JSON.stringify(entry),
    );
  } catch {
    // sessionStorage full or unavailable
  }
}

function readPersistedPalantirOntologyHistoryHead(
  contextEventId: string,
): PalantirOntologyHistoryEntry | null {
  if (typeof window === "undefined") {
    return null;
  }
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(historyStorageKey(id));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PalantirOntologyHistoryEntry;
    if (parsed?.contextEventId?.trim() !== id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function applyPalantirOntologyHistoryEntry(
  contextEventId: string,
  entry: PalantirOntologyHistoryEntry,
): PalantirOntologyHistoryEntry {
  if (entry.graph) {
    publishGeoOntologyGraph(entry.graph);
    publishGeoOntologyFacetState({
      contextEventId,
      activeFacetId: entry.facet.activeFacetId,
      rankedPlaceIds: entry.facet.rankedPlaceIds,
      highlightedPlaceId: entry.facet.highlightedPlaceId,
    });
  } else {
    publishGeoOntologyFacetState({
      contextEventId,
      activeFacetId: entry.facet.activeFacetId,
      rankedPlaceIds: entry.facet.rankedPlaceIds,
      highlightedPlaceId: entry.facet.highlightedPlaceId,
    });
  }

  if (entry.workspace) {
    publishPalantirWorkspaceSnapshot(entry.workspace);
  }

  const projection = entry.projection;
  if (projection.mode === "focus" && projection.visiblePlaceIds.length > 0) {
    publishFocusGlobeProjection({
      contextEventId,
      visiblePlaceIds: projection.visiblePlaceIds,
    });
  } else {
    publishGlobeProjectionLayerPolicy({
      mode: projection.mode,
      activeContextEventId: contextEventId,
      visiblePlaceIds: projection.visiblePlaceIds,
    });
  }

  return entry;
}

export function hasPalantirOntologyHistory(contextEventId: string): boolean {
  const id = contextEventId.trim();
  if (!id) {
    return false;
  }
  return (histories.get(id)?.length ?? 0) > 0;
}

export function readPalantirOntologyHistory(
  contextEventId: string,
): readonly PalantirOntologyHistoryEntry[] {
  const id = contextEventId.trim();
  if (!id) {
    return [];
  }
  return histories.get(id) ?? [];
}

export function readPalantirOntologyHistoryHead(
  contextEventId: string,
): PalantirOntologyHistoryEntry | null {
  const rows = readPalantirOntologyHistory(contextEventId);
  return rows.length > 0 ? rows[rows.length - 1]! : null;
}

/** Append Palantir object lineage — scout · refine · override · commit. */
export function recordPalantirOntologyHistory(input: {
  contextEventId: string;
  kind: PalantirOntologyHistoryKind;
  labelKo: string;
  graph?: GeoOntologyGraph | null;
  facet?: GeoOntologyFacetState;
  workspace?: PalantirWorkspaceSnapshot | null;
  projection?: GlobeProjectionLayerPolicy;
}): PalantirOntologyHistoryEntry {
  const contextEventId = input.contextEventId.trim();
  const entry: PalantirOntologyHistoryEntry = {
    id: `palantir-hist-${Date.now()}`,
    contextEventId,
    kind: input.kind,
    atIso: new Date().toISOString(),
    labelKo: input.labelKo.trim(),
    graph: input.graph ?? readGeoOntologyGraph(contextEventId),
    facet: input.facet ?? readGeoOntologyFacetState(contextEventId),
    workspace: input.workspace ?? readPalantirWorkspaceSnapshot(contextEventId),
    projection: input.projection ?? captureProjection(),
  };

  const next = [...(histories.get(contextEventId) ?? []), entry].slice(
    -MAX_ENTRIES_PER_CONTEXT,
  );
  histories.set(contextEventId, next);
  persistPalantirOntologyHistoryHead(entry);
  emit(contextEventId);
  return entry;
}

/** Context switch — replay latest ontology · workspace · projection for this event. */
export function restorePalantirOntologyHead(
  contextEventId: string,
): PalantirOntologyHistoryEntry | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }

  let entry = readPalantirOntologyHistoryHead(id);
  if (!entry) {
    entry = readPersistedPalantirOntologyHistoryHead(id);
    if (entry) {
      histories.set(id, [entry]);
    }
  }
  if (!entry) {
    return null;
  }

  applyPalantirOntologyHistoryEntry(id, entry);
  emit(id);
  return entry;
}

export function clearPalantirOntologyHistory(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  histories.delete(id);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(historyStorageKey(id));
    } catch {
      // ignore
    }
  }
  emit(id);
}

export function subscribePalantirOntologyHistory(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ contextEventId: string }>).detail.contextEventId);
  };
  window.addEventListener(HISTORY_EVENT, handler);
  return () => window.removeEventListener(HISTORY_EVENT, handler);
}
