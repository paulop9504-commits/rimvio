/**
 * Action Metadata — Capability / Tool / Entity execution trail (internal + merchant).
 */

import type { ActionMetadataRecord, ExperienceSurfaceId } from "@/lib/experience-app/surface-types";
import type { ExperienceAppRole } from "@/lib/experience-app/types";
import type { ExperienceResourceOp } from "@/lib/hub/dev/experience-os/types";
import { readSessionContext } from "@/lib/experience-app/surface-stack-store";

const KEY = "rimvio.experience-app.action-meta.v1";

let metaMemory: ActionMetadataRecord[] = [];
let metaSeq = 0;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function persist(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(metaMemory));
    window.dispatchEvent(new CustomEvent("rimvio:experience-action-meta"));
  } catch {
    /* quota */
  }
}

export function listActionMetadata(limit = 50): readonly ActionMetadataRecord[] {
  if (!canUseStorage()) return metaMemory.slice(-limit);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return metaMemory.slice(-limit);
    metaMemory = JSON.parse(raw) as ActionMetadataRecord[];
    return metaMemory.slice(-limit);
  } catch {
    return metaMemory.slice(-limit);
  }
}

const OP_INTENT: Partial<Record<ExperienceResourceOp, string>> = {
  "order.searchStores": "search_stores",
  "order.create": "create_order",
  "order.cancel": "cancel_order",
  "order.advance": "update_order_status",
  "order.stats": "order_stats",
  "order.status": "order_status",
  "order.list": "list_orders",
};

const OP_CAPABILITY: Partial<Record<ExperienceResourceOp, string>> = {
  "order.searchStores": "commerce.discovery",
  "order.create": "commerce.order",
  "order.cancel": "commerce.order.cancel",
  "order.advance": "commerce.order.status",
  "order.stats": "commerce.order.analytics",
  "order.status": "commerce.order.status",
  "order.list": "commerce.order",
};

export function recordActionMetadata(input: {
  readonly op: ExperienceResourceOp;
  readonly actorId: string;
  readonly actorRole: ExperienceAppRole;
  readonly surface?: ExperienceSurfaceId;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly status: "success" | "error";
}): ActionMetadataRecord {
  const ctx = readSessionContext();
  const record: ActionMetadataRecord = {
    actionId: `act-meta-${++metaSeq}-${Date.now().toString(36)}`,
    sessionId: ctx.sessionId,
    appId: ctx.appId,
    actorId: input.actorId,
    actorRole: input.actorRole,
    intent: OP_INTENT[input.op] ?? input.op,
    capability: OP_CAPABILITY[input.op] ?? "commerce",
    tool: input.op,
    surface: input.surface ?? readTopSurfaceId(),
    entityType: input.entityType,
    entityId: input.entityId,
    input: input.input,
    output: input.output,
    status: input.status,
    timestamp: new Date().toISOString(),
  };
  metaMemory = [...listActionMetadata(500), record];
  persist();
  return record;
}

function readTopSurfaceId(): ExperienceSurfaceId | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem("rimvio.experience-app.surface-stack.v1");
    if (!raw) return undefined;
    const stack = JSON.parse(raw) as Array<{ surface: ExperienceSurfaceId }>;
    return stack[stack.length - 1]?.surface;
  } catch {
    return undefined;
  }
}

export function resetActionMetadata(): void {
  metaMemory = [];
  metaSeq = 0;
  if (canUseStorage()) window.localStorage.removeItem(KEY);
}

export function subscribeActionMetadata(listener: () => void): () => void {
  if (!canUseStorage()) return () => {};
  window.addEventListener("rimvio:experience-action-meta", listener);
  return () => window.removeEventListener("rimvio:experience-action-meta", listener);
}
