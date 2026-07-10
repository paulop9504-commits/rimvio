/**
 * Durable HubActionRecord log on Context (EventCandidate.metadata).
 * Session store is a fast cache; metadata is the Reality-backed append log.
 *
 * @see docs/GLOBE_HUB_RESOURCE.md — 3-Layer Storage Model
 */

import type { EventCandidate } from "@/lib/events/event-candidate";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import type {
  HubAction,
  HubActionStatus,
  HubActionType,
} from "@/lib/globe/resource/hub-action-record";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";

export const CONTEXT_HUB_ACTION_LOG_META_KEY = "contextHubActionLog";

const MAX_DURABLE_ROWS = 200;

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseStatus(value: unknown): HubActionStatus | null {
  return value === "pending" || value === "success" || value === "failed"
    ? value
    : null;
}

function parseType(value: unknown): HubActionType | null {
  return value === "search" ||
    value === "reserve" ||
    value === "purchase" ||
    value === "cancel"
    ? value
    : null;
}

function parseOne(raw: unknown): HubAction | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const actionId = asTrimmedString(row.actionId);
  const contextEventId = asTrimmedString(row.contextEventId);
  const type = parseType(row.type);
  const status = parseStatus(row.status);
  const createdAt = asTrimmedString(row.createdAt);
  if (!actionId || !contextEventId || !type || !status || !createdAt) {
    return null;
  }
  if (!row.payload || typeof row.payload !== "object") {
    return null;
  }

  const resourceIdRaw = row.resourceId;
  const resourceId =
    resourceIdRaw == null
      ? null
      : asTrimmedString(resourceIdRaw);

  if (type === "search" && resourceId != null) {
    return null;
  }
  if (type !== "search" && !resourceId) {
    return null;
  }

  const base = {
    actionId,
    contextEventId,
    resourceId,
    status,
    createdAt,
    externalRef: asTrimmedString(row.externalRef) ?? undefined,
    operatorRuntimeId: asTrimmedString(row.operatorRuntimeId) ?? undefined,
    sourceHubId: asTrimmedString(row.sourceHubId) ?? undefined,
    approvalPolicy:
      row.approvalPolicy === "user_tap" || row.approvalPolicy === "auto_prep"
        ? row.approvalPolicy
        : undefined,
    supersedesActionId: asTrimmedString(row.supersedesActionId) ?? undefined,
  };

  return {
    ...base,
    type,
    payload: row.payload,
  } as HubAction;
}

export function readHubActionLogFromEvent(
  event: EventCandidate | null | undefined,
): HubAction[] {
  if (!event) {
    return [];
  }
  const raw = event.metadata?.[CONTEXT_HUB_ACTION_LOG_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parseOne).filter((row): row is HubAction => row != null);
}

export function readDurableHubActionLog(
  contextEventId: string,
): HubAction[] {
  const event = findLifeEventCandidate(contextEventId.trim());
  return readHubActionLogFromEvent(event);
}

/**
 * Append-only durable write. Skips when Context event is missing (session-only until Commit).
 * Never mutates prior rows — replaces the array with prior + new only when actionId is new.
 */
export function appendDurableHubActionLog(input: {
  contextEventId: string;
  action: HubAction;
  /** Full ordered log after append (session-merged). */
  rows: readonly HubAction[];
}): EventCandidate | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return null;
  }
  const event = findLifeEventCandidate(contextEventId);
  if (!event) {
    return null;
  }

  const prior = readHubActionLogFromEvent(event);
  if (prior.some((row) => row.actionId === input.action.actionId)) {
    return event;
  }

  const capped =
    input.rows.length > MAX_DURABLE_ROWS
      ? input.rows.slice(input.rows.length - MAX_DURABLE_ROWS)
      : [...input.rows];

  const stamp = new Date().toISOString();
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
    metadata: {
      ...(event.metadata ?? {}),
      [CONTEXT_HUB_ACTION_LOG_META_KEY]: capped,
      feedPlanEnabled: event.metadata?.feedPlanEnabled ?? true,
    },
  });
}

/** Test / explicit wipe — clears durable metadata key only. */
export function clearDurableHubActionLog(
  contextEventId: string,
): EventCandidate | null {
  const event = findLifeEventCandidate(contextEventId.trim());
  if (!event) {
    return null;
  }
  if (event.metadata?.[CONTEXT_HUB_ACTION_LOG_META_KEY] == null) {
    return event;
  }
  const stamp = new Date().toISOString();
  // mergeEventMetadata drops keys set to undefined (does not drop omitted keys).
  return commitEventUpsert({
    id: event.id,
    title: event.title,
    category: event.category,
    source: event.source,
    lifecycle: event.lifecycle,
    datetime: event.datetime,
    place: event.place,
    description: event.description,
    confidence: event.confidence,
    lifecycleUpdatedAt: stamp,
    updatedAt: stamp,
    metadata: {
      ...(event.metadata ?? {}),
      [CONTEXT_HUB_ACTION_LOG_META_KEY]: undefined,
    },
  });
}
