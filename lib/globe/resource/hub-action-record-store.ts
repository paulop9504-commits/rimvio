/**
 * Append-only HubActionRecord log per Context.
 * Session/memory = fast cache; EventCandidate.metadata = durable Reality log.
 *
 * @see docs/GLOBE_HUB_RESOURCE.md — 3-Layer Storage Model
 */

import {
  createSearchAction,
  type HubAction,
  type HubActionSearchPayload,
  type HubActionRecordBase,
  type HubActionStatus,
} from "@/lib/globe/resource/hub-action-record";
import {
  appendDurableHubActionLog,
  clearDurableHubActionLog,
  readDurableHubActionLog,
} from "@/lib/globe/resource/context-hub-action-log-metadata";

const STORAGE_PREFIX = "rimvio.hub-action-log.";
const MAX_ROWS_PER_CONTEXT = 200;

const memoryLog = new Map<string, HubAction[]>();

export const HUB_ACTION_LOG_EVENT = "rimvio:hub-action-log";

export type HubActionEmitResult =
  | {
      ok: true;
      action: HubAction;
      rows: readonly HubAction[];
      durable: boolean;
    }
  | { ok: false; reason: string };

type SearchEmitInput = Omit<
  HubActionRecordBase,
  "actionId" | "status" | "createdAt" | "resourceId"
> & {
  status?: HubActionStatus;
  actionId?: string;
  payload: HubActionSearchPayload;
  resourceId?: null;
};

function storageKey(contextEventId: string): string {
  return `${STORAGE_PREFIX}${contextEventId.trim()}`;
}

function notify(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(HUB_ACTION_LOG_EVENT, {
      detail: { contextEventId: contextEventId.trim() },
    }),
  );
}

function readSessionRaw(contextEventId: string): HubAction[] {
  const key = contextEventId.trim();
  if (!key) {
    return [];
  }

  if (typeof window === "undefined") {
    return [...(memoryLog.get(key) ?? [])];
  }

  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) {
      return [...(memoryLog.get(key) ?? [])];
    }
    const parsed = JSON.parse(raw) as HubAction[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof row.actionId === "string" &&
        row.actionId.trim() &&
        typeof row.type === "string",
    );
  } catch {
    return [...(memoryLog.get(key) ?? [])];
  }
}

function writeSessionRaw(contextEventId: string, rows: readonly HubAction[]): void {
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  const capped =
    rows.length > MAX_ROWS_PER_CONTEXT
      ? rows.slice(rows.length - MAX_ROWS_PER_CONTEXT)
      : [...rows];

  memoryLog.set(key, capped);

  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(capped));
    notify(key);
  } catch {
    // memory already updated
    notify(key);
  }
}

/** Merge session cache + durable metadata by actionId (createdAt ascending). */
export function mergeHubActionLogs(
  sessionRows: readonly HubAction[],
  durableRows: readonly HubAction[],
): HubAction[] {
  const byId = new Map<string, HubAction>();
  for (const row of durableRows) {
    byId.set(row.actionId, row);
  }
  for (const row of sessionRows) {
    if (!byId.has(row.actionId)) {
      byId.set(row.actionId, row);
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export function readHubActionLog(contextEventId: string): readonly HubAction[] {
  const key = contextEventId.trim();
  if (!key) {
    return [];
  }
  return mergeHubActionLogs(readSessionRaw(key), readDurableHubActionLog(key));
}

export function clearHubActionLog(contextEventId: string): void {
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  memoryLog.delete(key);
  void clearDurableHubActionLog(key);
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(storageKey(key));
    notify(key);
  } catch {
    // ignore
  }
}

/**
 * Validate 3-layer rules then append.
 * Dual-write: session cache + EventCandidate.metadata when Context exists.
 */
export function emitHubActionRecord(action: HubAction): HubActionEmitResult {
  const contextEventId = action.contextEventId?.trim() ?? "";
  if (!contextEventId) {
    return { ok: false, reason: "missing_context_event_id" };
  }
  if (!action.actionId?.trim()) {
    return { ok: false, reason: "missing_action_id" };
  }

  if (action.type === "search") {
    if (action.resourceId != null) {
      return { ok: false, reason: "search_must_have_null_resource" };
    }
  } else if (action.type === "reserve" || action.type === "purchase") {
    if (!action.resourceId?.trim()) {
      return { ok: false, reason: `${action.type}_requires_resource` };
    }
  } else if (action.type === "cancel") {
    if (!action.resourceId?.trim()) {
      return { ok: false, reason: "cancel_requires_resource" };
    }
    if (!action.supersedesActionId?.trim()) {
      return { ok: false, reason: "cancel_requires_supersedes" };
    }
  }

  const prior = mergeHubActionLogs(
    readSessionRaw(contextEventId),
    readDurableHubActionLog(contextEventId),
  );
  if (prior.some((row) => row.actionId === action.actionId)) {
    return { ok: false, reason: "action_id_already_exists" };
  }

  if (action.type === "cancel" && action.supersedesActionId) {
    const target = prior.find((row) => row.actionId === action.supersedesActionId);
    if (!target) {
      return { ok: false, reason: "supersedes_target_not_found" };
    }
  }

  const normalized: HubAction = {
    ...action,
    contextEventId,
    resourceId:
      action.type === "search" ? null : (action.resourceId?.trim() ?? null),
  };

  const next = [...prior, normalized];
  writeSessionRaw(contextEventId, next);
  const durableEvent = appendDurableHubActionLog({
    contextEventId,
    action: normalized,
    rows: next,
  });

  return {
    ok: true,
    action: normalized,
    rows: next,
    durable: durableEvent != null,
  };
}

/** Build search row + append (Hub / Operator call site helper). */
export function emitSearchHubAction(input: SearchEmitInput): HubActionEmitResult {
  return emitHubActionRecord(createSearchAction(input));
}
