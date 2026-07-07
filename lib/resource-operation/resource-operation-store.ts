import {
  mergeResourceOperationStage,
  shouldShowResourceOperationSignal,
} from "@/lib/resource-operation/resource-operation-signal";
import type {
  ResourceOperation,
  ResourceOperationDomain,
  ResourceOperationStage,
} from "@/lib/resource-operation/types";

export const RESOURCE_OPERATION_STORAGE_KEY = "rimvio.resource-operation.v1";
export const RESOURCE_OPERATION_UPDATED_EVENT = "rimvio:resource-operation-updated";

type StoreSnapshot = {
  byResourceId: Record<string, ResourceOperation>;
};

let snapshot: StoreSnapshot = { byResourceId: {} };
let hydrated = false;

function emit(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(RESOURCE_OPERATION_UPDATED_EVENT));
}

function readStorage(): StoreSnapshot {
  if (typeof window === "undefined") {
    return { byResourceId: {} };
  }
  try {
    const raw = sessionStorage.getItem(RESOURCE_OPERATION_STORAGE_KEY);
    if (!raw) {
      return { byResourceId: {} };
    }
    const parsed = JSON.parse(raw) as Partial<StoreSnapshot>;
    return {
      byResourceId:
        parsed.byResourceId && typeof parsed.byResourceId === "object"
          ? parsed.byResourceId
          : {},
    };
  } catch {
    return { byResourceId: {} };
  }
}

function writeStorage(next: StoreSnapshot): void {
  snapshot = next;
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(RESOURCE_OPERATION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  emit();
}

function ensureHydrated(): void {
  if (hydrated) {
    return;
  }
  snapshot = readStorage();
  hydrated = true;
}

function buildOperationId(contextEventId: string, resourceId: string): string {
  return `${contextEventId.trim()}::${resourceId.trim()}`;
}

export function readResourceOperation(
  resourceId: string,
): ResourceOperation | null {
  ensureHydrated();
  const key = resourceId.trim();
  if (!key) {
    return null;
  }
  return snapshot.byResourceId[key] ?? null;
}

export function listResourceOperationsForContext(
  contextEventId: string,
): ResourceOperation[] {
  ensureHydrated();
  const key = contextEventId.trim();
  if (!key) {
    return [];
  }
  return Object.values(snapshot.byResourceId).filter(
    (row) => row.contextEventId === key && shouldShowResourceOperationSignal(row.stage),
  );
}

export type UpsertResourceOperationInput = {
  contextEventId: string;
  resourceId: string;
  domain: ResourceOperationDomain;
  label: string;
  stage: ResourceOperationStage;
  lat?: number | null;
  lng?: number | null;
};

export function upsertResourceOperation(
  input: UpsertResourceOperationInput,
): ResourceOperation {
  ensureHydrated();
  const contextEventId = input.contextEventId.trim();
  const resourceId = input.resourceId.trim();
  const existing = snapshot.byResourceId[resourceId] ?? null;
  const stage = mergeResourceOperationStage(existing?.stage, input.stage);
  const next: ResourceOperation = {
    operationId: buildOperationId(contextEventId, resourceId),
    contextEventId,
    resourceId,
    domain: input.domain,
    label: input.label.trim() || existing?.label || "맥락",
    stage,
    lat: input.lat ?? existing?.lat ?? null,
    lng: input.lng ?? existing?.lng ?? null,
    updatedAt: new Date().toISOString(),
  };
  writeStorage({
    byResourceId: {
      ...snapshot.byResourceId,
      [resourceId]: next,
    },
  });
  return next;
}

export function transitionResourceOperationStage(
  resourceId: string,
  stage: ResourceOperationStage,
): ResourceOperation | null {
  ensureHydrated();
  const key = resourceId.trim();
  const existing = snapshot.byResourceId[key];
  if (!existing) {
    return null;
  }
  const next: ResourceOperation = {
    ...existing,
    stage,
    updatedAt: new Date().toISOString(),
  };
  writeStorage({
    byResourceId: {
      ...snapshot.byResourceId,
      [key]: next,
    },
  });
  return next;
}

export function dismissOtherResourceOperations(
  contextEventId: string,
  keepResourceId: string,
): void {
  ensureHydrated();
  const eventKey = contextEventId.trim();
  const keepKey = keepResourceId.trim();
  if (!eventKey || !keepKey) {
    return;
  }
  let changed = false;
  const byResourceId = { ...snapshot.byResourceId };
  for (const [resourceId, row] of Object.entries(byResourceId)) {
    if (row.contextEventId !== eventKey || resourceId === keepKey) {
      continue;
    }
    if (row.stage === "committed" || row.stage === "dismissed") {
      continue;
    }
    if (row.stage === "booking" || row.stage === "awaiting_pay") {
      continue;
    }
    byResourceId[resourceId] = {
      ...row,
      stage: "dismissed",
      updatedAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (changed) {
    writeStorage({ byResourceId });
  }
}

export function subscribeResourceOperations(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => listener();
  window.addEventListener(RESOURCE_OPERATION_UPDATED_EVENT, handler);
  return () => window.removeEventListener(RESOURCE_OPERATION_UPDATED_EVENT, handler);
}
