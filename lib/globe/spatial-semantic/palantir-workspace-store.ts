import type { PalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-operator";

const WORKSPACE_EVENT = "rimvio-palantir-workspace";

const snapshots = new Map<string, PalantirWorkspaceSnapshot>();

function emit(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ contextEventId: string }>(WORKSPACE_EVENT, {
      detail: { contextEventId },
    }),
  );
}

export function readPalantirWorkspaceSnapshot(
  contextEventId: string,
): PalantirWorkspaceSnapshot | null {
  const id = contextEventId.trim();
  if (!id) {
    return null;
  }
  return snapshots.get(id) ?? null;
}

export function publishPalantirWorkspaceSnapshot(
  snapshot: PalantirWorkspaceSnapshot,
): void {
  const id = snapshot.contextEventId.trim();
  if (!id) {
    return;
  }
  snapshots.set(id, snapshot);
  emit(id);
}

export function clearPalantirWorkspaceSnapshot(contextEventId: string): void {
  const id = contextEventId.trim();
  if (!id) {
    return;
  }
  snapshots.delete(id);
  emit(id);
}

export function subscribePalantirWorkspaceSnapshot(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<{ contextEventId: string }>).detail.contextEventId);
  };
  window.addEventListener(WORKSPACE_EVENT, handler);
  return () => window.removeEventListener(WORKSPACE_EVENT, handler);
}
