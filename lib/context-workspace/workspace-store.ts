/**
 * Context Workspace session store — provisional SSOT until Commit.
 * Drafts persist in localStorage so refresh restores editing state.
 */

import type {
  ContextWorkspaceOpenDetail,
  ContextWorkspaceState,
} from "@/lib/context-workspace/types";

const STORAGE_PREFIX = "rimvio.context-workspace.";
const INDEX_KEY = "rimvio.context-workspace.index";
const EXPAND_PREFIX = "rimvio.context-workspace.expanded.";
const memory = new Map<string, ContextWorkspaceState>();

export const CONTEXT_WORKSPACE_UPDATED = "rimvio:context-workspace-updated";
export const CONTEXT_WORKSPACE_OPEN = "rimvio:context-workspace-open";
export const CONTEXT_WORKSPACE_CLOSE = "rimvio:context-workspace-close";

function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readIndex(): string[] {
  const store = storage();
  if (!store) {
    return [...memory.keys()];
  }
  try {
    const raw = store.getItem(INDEX_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (id): id is string => typeof id === "string" && Boolean(id.trim()),
        )
      : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: readonly string[]): void {
  const store = storage();
  if (!store) {
    return;
  }
  try {
    store.setItem(INDEX_KEY, JSON.stringify([...new Set(ids)].slice(0, 40)));
  } catch {
    // ignore quota
  }
}

function normalizeState(
  parsed: ContextWorkspaceState,
): ContextWorkspaceState | null {
  if (
    !parsed?.workspaceId?.trim() ||
    !["lodging", "eatery", "poi", "amenity"].includes(parsed.domain)
  ) {
    return null;
  }
  return {
    ...parsed,
    lastWhy: parsed.lastWhy ?? null,
    relationshipEdges: Array.isArray(parsed.relationshipEdges)
      ? parsed.relationshipEdges
      : [],
  };
}

function emitUpdated(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(CONTEXT_WORKSPACE_UPDATED, {
      detail: { contextEventId },
    }),
  );
}

export function readContextWorkspace(
  contextEventId: string,
): ContextWorkspaceState | null {
  const key = contextEventId.trim();
  if (!key) {
    return null;
  }
  if (typeof window === "undefined") {
    return memory.get(key) ?? null;
  }
  try {
    const store = storage();
    const raw = store?.getItem(`${STORAGE_PREFIX}${key}`) ?? null;
    if (!raw) {
      // migrate one-shot from sessionStorage if present
      try {
        const legacy = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (legacy) {
          const parsed = normalizeState(
            JSON.parse(legacy) as ContextWorkspaceState,
          );
          if (parsed) {
            memory.set(key, parsed);
            store?.setItem(`${STORAGE_PREFIX}${key}`, legacy);
            window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
            return parsed;
          }
        }
      } catch {
        // ignore
      }
      return memory.get(key) ?? null;
    }
    const parsed = normalizeState(JSON.parse(raw) as ContextWorkspaceState);
    if (!parsed) {
      return null;
    }
    memory.set(key, parsed);
    return parsed;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeContextWorkspace(state: ContextWorkspaceState): void {
  const key = state.contextEventId.trim();
  if (!key) {
    return;
  }
  memory.set(key, state);
  const store = storage();
  if (store) {
    try {
      store.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(state));
      const index = readIndex().filter((id) => id !== key);
      if (state.status === "editing" || state.status === "committing") {
        index.unshift(key);
      }
      writeIndex(index);
    } catch {
      // ignore quota
    }
  }
  emitUpdated(key);
}

export function clearContextWorkspace(contextEventId: string): void {
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  memory.delete(key);
  const store = storage();
  if (store) {
    try {
      store.removeItem(`${STORAGE_PREFIX}${key}`);
      store.removeItem(`${EXPAND_PREFIX}${key}`);
      writeIndex(readIndex().filter((id) => id !== key));
    } catch {
      // ignore
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CONTEXT_WORKSPACE_CLOSE, {
        detail: { contextEventId: key },
      }),
    );
  }
  emitUpdated(key);
}

export function writeContextWorkspaceExpanded(
  contextEventId: string,
  expanded: boolean,
): void {
  const key = contextEventId.trim();
  const store = storage();
  if (!key || !store) {
    return;
  }
  try {
    if (expanded) {
      store.setItem(`${EXPAND_PREFIX}${key}`, "1");
    } else {
      store.removeItem(`${EXPAND_PREFIX}${key}`);
    }
  } catch {
    // ignore
  }
}

export function readContextWorkspaceExpanded(contextEventId: string): boolean {
  const key = contextEventId.trim();
  const store = storage();
  if (!key || !store) {
    return false;
  }
  try {
    return store.getItem(`${EXPAND_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

export function hasProvisionalContextWorkspace(
  contextEventId: string | null | undefined,
): boolean {
  const state = readContextWorkspace(contextEventId?.trim() ?? "");
  if (!state) {
    return false;
  }
  return state.status === "editing" || state.status === "committing";
}

/** @deprecated use hasProvisionalContextWorkspace */
export function hasProvisionalLodgingWorkspace(
  contextEventId: string | null | undefined,
): boolean {
  return hasProvisionalContextWorkspace(contextEventId);
}

export function listDraftContextWorkspaceEventIds(): readonly string[] {
  return readIndex().filter((id) => {
    const state = readContextWorkspace(id);
    return state?.status === "editing" || state?.status === "committing";
  });
}

export function dispatchContextWorkspaceOpen(
  detail: ContextWorkspaceOpenDetail,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextWorkspaceOpenDetail>(CONTEXT_WORKSPACE_OPEN, {
      detail,
    }),
  );
}

export function subscribeContextWorkspaceUpdated(
  listener: (contextEventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const id = (event as CustomEvent<{ contextEventId: string }>).detail
      ?.contextEventId;
    if (id) {
      listener(id);
    }
  };
  window.addEventListener(CONTEXT_WORKSPACE_UPDATED, handler);
  return () => window.removeEventListener(CONTEXT_WORKSPACE_UPDATED, handler);
}

export function subscribeContextWorkspaceOpen(
  listener: (detail: ContextWorkspaceOpenDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextWorkspaceOpenDetail>).detail);
  };
  window.addEventListener(CONTEXT_WORKSPACE_OPEN, handler);
  return () => window.removeEventListener(CONTEXT_WORKSPACE_OPEN, handler);
}
