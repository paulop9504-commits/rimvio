import {
  createMeaningEdgeAccumulator,
  scoreMeaningEdge,
} from "@/lib/meaning/score-meaning-edge";
import { meaningEdgeId } from "@/lib/meaning/meaning-node-id";
import type { MeaningEdgeKind } from "@/lib/meaning/meaning-types";
import {
  ENTITY_GRAPH_CONTRACT_VERSION,
  EMPTY_ENTITY_GRAPH_SNAPSHOT,
  mergeEntityEdgeEvidence,
  type EntityEdge,
  type EntityEdgeEvidence,
  type EntityGraphSnapshot,
} from "@/lib/ontology/edge-types";
import type { RimvioEntityId } from "@/lib/ontology/entity-types";

const STORAGE_KEY = "rimvio.entity-graph.v1";
const MAX_EDGES = 512;

let cache: EntityGraphSnapshot | null = null;
let memoryStore: EntityGraphSnapshot = { ...EMPTY_ENTITY_GRAPH_SNAPSHOT };

function clone(snapshot: EntityGraphSnapshot): EntityGraphSnapshot {
  return {
    version: snapshot.version,
    edges: snapshot.edges.map((row) => ({
      ...row,
      evidence: [...row.evidence],
    })),
    updatedAt: snapshot.updatedAt,
  };
}

function readStorage(): EntityGraphSnapshot | null {
  if (typeof window === "undefined") {
    return clone(memoryStore);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as EntityGraphSnapshot;
    if (parsed.version !== ENTITY_GRAPH_CONTRACT_VERSION) {
      return null;
    }
    return {
      version: ENTITY_GRAPH_CONTRACT_VERSION,
      edges: [...(parsed.edges ?? [])],
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStorage(snapshot: EntityGraphSnapshot): void {
  if (typeof window === "undefined") {
    memoryStore = clone(snapshot);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function readEntityGraphSnapshot(): EntityGraphSnapshot {
  if (cache) {
    return clone(cache);
  }
  const stored = readStorage();
  if (stored) {
    cache = stored;
    return clone(stored);
  }
  return clone(EMPTY_ENTITY_GRAPH_SNAPSHOT);
}

function weightFromEvidence(
  evidence: readonly EntityEdgeEvidence[],
  nowMs: number,
): number {
  if (evidence.length === 0) {
    return 0;
  }
  const acc = createMeaningEdgeAccumulator();
  for (const row of evidence) {
    if (row.type === "event") {
      acc.eventIds.add(row.id);
    }
  }
  acc.lastAtMs = nowMs;
  return scoreMeaningEdge(acc, nowMs).total;
}

function assertHasEvidence(evidence: readonly EntityEdgeEvidence[]): void {
  if (evidence.length === 0) {
    throw new Error("[entity-graph] edge evidence is required");
  }
}

export function writeEntityGraphSnapshot(
  snapshot: EntityGraphSnapshot,
): EntityGraphSnapshot {
  const sorted = [...snapshot.edges]
    .sort((a, b) => b.weight - a.weight || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_EDGES);
  const next: EntityGraphSnapshot = {
    version: ENTITY_GRAPH_CONTRACT_VERSION,
    edges: sorted,
    updatedAt: snapshot.updatedAt,
  };
  cache = next;
  writeStorage(next);
  return clone(next);
}

export function upsertEntityEdge(edge: EntityEdge): EntityGraphSnapshot {
  assertHasEvidence(edge.evidence);

  const current = readEntityGraphSnapshot();
  const map = new Map(current.edges.map((row) => [row.id, row]));
  const existing = map.get(edge.id);
  const nowIso = edge.updatedAt;
  const nowMs = Date.parse(nowIso) || Date.now();

  if (!existing) {
    map.set(edge.id, edge);
    return writeEntityGraphSnapshot({
      version: ENTITY_GRAPH_CONTRACT_VERSION,
      edges: [...map.values()],
      updatedAt: nowIso,
    });
  }

  const evidence = mergeEntityEdgeEvidence(existing.evidence, edge.evidence);
  assertHasEvidence(evidence);

  const merged: EntityEdge = {
    ...existing,
    kind: edge.kind,
    fromEntityId: edge.fromEntityId,
    toEntityId: edge.toEntityId,
    evidence,
    weight: weightFromEvidence(evidence, nowMs),
    updatedAt: nowIso,
  };
  map.set(edge.id, merged);

  return writeEntityGraphSnapshot({
    version: ENTITY_GRAPH_CONTRACT_VERSION,
    edges: [...map.values()],
    updatedAt: nowIso,
  });
}

export function entityEdgeFromMeaningBucket(input: {
  kind: MeaningEdgeKind;
  fromId: string;
  toId: string;
  eventIds: readonly string[];
  weight: number;
  atIso: string;
}): EntityEdge {
  const evidence: EntityEdgeEvidence[] = input.eventIds.map((id) => ({
    type: "event",
    id,
  }));
  assertHasEvidence(evidence);

  const fromEntityId = input.fromId as RimvioEntityId;
  const toEntityId = input.toId as RimvioEntityId;
  const id = meaningEdgeId(input.kind, input.fromId, input.toId);

  return {
    id,
    kind: input.kind,
    fromEntityId,
    toEntityId,
    weight: input.weight,
    evidence,
    createdAt: input.atIso,
    updatedAt: input.atIso,
  };
}

export function resetEntityGraphStoreForTests(): void {
  cache = null;
  memoryStore = { ...EMPTY_ENTITY_GRAPH_SNAPSHOT };
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
