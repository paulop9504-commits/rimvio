import {
  EMPTY_SITUATION_PROJECTION_MANIFEST,
  SITUATION_PROJECTION_CONTRACT_VERSION,
  SITUATION_PROJECTION_STORAGE_KEY,
  type SituationProjectionManifest,
} from "@/lib/situation-projection/types";

type ProjectionStoreSnapshot = {
  version: typeof SITUATION_PROJECTION_CONTRACT_VERSION;
  byAnchorEventId: Record<string, SituationProjectionManifest>;
  updatedAt: string;
};

export const SITUATION_PROJECTION_UPDATED = "rimvio-situation-projection-updated";

let memoryStore: ProjectionStoreSnapshot = {
  version: SITUATION_PROJECTION_CONTRACT_VERSION,
  byAnchorEventId: {},
  updatedAt: new Date(0).toISOString(),
};

function normalizeManifest(raw: SituationProjectionManifest): SituationProjectionManifest {
  return {
    version: SITUATION_PROJECTION_CONTRACT_VERSION,
    manifestId: raw.manifestId,
    situationType: raw.situationType,
    anchorEventId: raw.anchorEventId,
    trigger: raw.trigger,
    surfaceKind: raw.surfaceKind,
    nodes: [...(raw.nodes ?? [])],
    links: [...(raw.links ?? [])].map((link) => ({
      ...link,
      strokeStyle: link.strokeStyle ?? (link.virtual ? "dashed" : "solid"),
      weight: link.weight ?? (link.virtual ? 28 : 62),
    })),
    pills: [...(raw.pills ?? [])],
    composedAt: raw.composedAt,
    readOnly: true,
    layoutSource: raw.layoutSource ?? "deterministic",
    mindMapLayout: raw.mindMapLayout,
    travelBrain: raw.travelBrain ?? null,
  };
}

function readStorage(): ProjectionStoreSnapshot {
  if (typeof window === "undefined") {
    return {
      version: memoryStore.version,
      byAnchorEventId: { ...memoryStore.byAnchorEventId },
      updatedAt: memoryStore.updatedAt,
    };
  }
  try {
    const raw = window.localStorage.getItem(SITUATION_PROJECTION_STORAGE_KEY);
    if (!raw) {
      return {
        version: SITUATION_PROJECTION_CONTRACT_VERSION,
        byAnchorEventId: {},
        updatedAt: new Date(0).toISOString(),
      };
    }
    const parsed = JSON.parse(raw) as ProjectionStoreSnapshot;
    const byAnchorEventId: Record<string, SituationProjectionManifest> = {};
    for (const [key, row] of Object.entries(parsed.byAnchorEventId ?? {})) {
      byAnchorEventId[key] = normalizeManifest(row);
    }
    return {
      version: SITUATION_PROJECTION_CONTRACT_VERSION,
      byAnchorEventId,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return {
      version: SITUATION_PROJECTION_CONTRACT_VERSION,
      byAnchorEventId: {},
      updatedAt: new Date(0).toISOString(),
    };
  }
}

function writeStorage(snapshot: ProjectionStoreSnapshot): void {
  if (typeof window === "undefined") {
    memoryStore = {
      version: snapshot.version,
      byAnchorEventId: { ...snapshot.byAnchorEventId },
      updatedAt: snapshot.updatedAt,
    };
    return;
  }
  window.localStorage.setItem(SITUATION_PROJECTION_STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent(SITUATION_PROJECTION_UPDATED));
}

export function readProjectionManifestForAnchor(
  anchorEventId: string,
): SituationProjectionManifest | null {
  const key = anchorEventId.trim();
  if (!key) {
    return null;
  }
  const row = readStorage().byAnchorEventId[key];
  return row ?? null;
}

export function writeProjectionManifest(
  manifest: SituationProjectionManifest,
): SituationProjectionManifest {
  if (!manifest.readOnly) {
    throw new Error("[situation-projection] manifest must be readOnly");
  }
  const anchorEventId = manifest.anchorEventId.trim();
  if (!anchorEventId) {
    throw new Error("[situation-projection] anchorEventId required");
  }

  const current = readStorage();
  const next: ProjectionStoreSnapshot = {
    version: SITUATION_PROJECTION_CONTRACT_VERSION,
    byAnchorEventId: {
      ...current.byAnchorEventId,
      [anchorEventId]: manifest,
    },
    updatedAt: manifest.composedAt,
  };
  writeStorage(next);
  return manifest;
}

export function listProjectionManifests(): SituationProjectionManifest[] {
  return Object.values(readStorage().byAnchorEventId);
}

export function resetProjectionStoreForTests(): void {
  memoryStore = {
    version: SITUATION_PROJECTION_CONTRACT_VERSION,
    byAnchorEventId: {},
    updatedAt: new Date(0).toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SITUATION_PROJECTION_STORAGE_KEY);
  }
}

export function subscribeProjectionStore(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(SITUATION_PROJECTION_UPDATED, listener);
  return () => window.removeEventListener(SITUATION_PROJECTION_UPDATED, listener);
}

export { EMPTY_SITUATION_PROJECTION_MANIFEST };
