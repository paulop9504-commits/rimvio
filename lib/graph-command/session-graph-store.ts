/**
 * Session Graph SSOT — keyed by contextEventId.
 * In-memory + localStorage durable mirror (client Graph Engine).
 */

import type { SessionGraphV1 } from "@/lib/graph-command/types";
import { GRAPH_COMMAND_VERSION } from "@/lib/graph-command/types";

const EVENT_NAME = "rimvio-graph-command-session";
const STORAGE_KEY = "rimvio-session-graphs-v2";

const byContextEventId = new Map<string, SessionGraphV1>();
let hydrated = false;

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function persist(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: Record<string, SessionGraphV1> = {};
    for (const [id, graph] of byContextEventId) {
      payload[id] = graph;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function hydrateFromStorage(): void {
  if (hydrated || typeof window === "undefined") {
    return;
  }
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, SessionGraphV1>;
    for (const [id, graph] of Object.entries(parsed)) {
      if (graph?.contextEventId && Array.isArray(graph.nodes)) {
        byContextEventId.set(id, {
          ...graph,
          version: GRAPH_COMMAND_VERSION,
          projectFolders: graph.projectFolders ?? [],
          nodes: graph.nodes.map((n) => ({
            ...n,
            localFavorite:
              typeof (n as { localFavorite?: boolean }).localFavorite ===
              "boolean"
                ? (n as { localFavorite: boolean }).localFavorite
                : false,
          })),
        });
      }
    }
  } catch {
    // ignore corrupt storage
  }
}

export function emptySessionGraph(input: {
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): SessionGraphV1 {
  return {
    version: GRAPH_COMMAND_VERSION,
    contextEventId: input.contextEventId.trim(),
    nodes: [],
    edges: [],
    selectionIds: [],
    activeFilters: {},
    compareClusterId: null,
    projectFolders: [],
    anchorLat: input.anchorLat ?? null,
    anchorLng: input.anchorLng ?? null,
    updatedAtIso: new Date().toISOString(),
  };
}

export function writeSessionGraph(graph: SessionGraphV1): void {
  hydrateFromStorage();
  const id = graph.contextEventId.trim();
  if (!id) {
    return;
  }
  byContextEventId.set(id, graph);
  persist();
  emit();
}

export function readSessionGraph(
  contextEventId: string | null | undefined,
): SessionGraphV1 | null {
  hydrateFromStorage();
  const id = contextEventId?.trim();
  if (!id) {
    return null;
  }
  return byContextEventId.get(id) ?? null;
}

export function ensureSessionGraph(input: {
  contextEventId: string;
  anchorLat?: number | null;
  anchorLng?: number | null;
}): SessionGraphV1 {
  const existing = readSessionGraph(input.contextEventId);
  if (existing) {
    if (
      (input.anchorLat != null && existing.anchorLat == null) ||
      (input.anchorLng != null && existing.anchorLng == null)
    ) {
      const next: SessionGraphV1 = {
        ...existing,
        anchorLat: existing.anchorLat ?? input.anchorLat ?? null,
        anchorLng: existing.anchorLng ?? input.anchorLng ?? null,
        updatedAtIso: new Date().toISOString(),
      };
      writeSessionGraph(next);
      return next;
    }
    return existing;
  }
  const created = emptySessionGraph(input);
  writeSessionGraph(created);
  return created;
}

export function deleteSessionGraph(
  contextEventId: string | null | undefined,
): void {
  hydrateFromStorage();
  const id = contextEventId?.trim();
  if (!id || !byContextEventId.has(id)) {
    return;
  }
  byContextEventId.delete(id);
  persist();
  emit();
}

export function clearSessionGraphs(): void {
  byContextEventId.clear();
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

export function listSessionGraphContextIds(): readonly string[] {
  hydrateFromStorage();
  return [...byContextEventId.keys()];
}

export function subscribeSessionGraph(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function resetGraphCommandStoreForTests(): void {
  byContextEventId.clear();
  hydrated = true;
}
