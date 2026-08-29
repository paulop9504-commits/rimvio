/**
 * P7 — Pending publish approval session (sessionStorage).
 */

import type { PublishGateResult } from "@/lib/hub/dev/hub-publish-flow";

const PENDING_PUBLISH_KEY = "rimvio-hub-dev-pending-publish";

let memoryPendingPublish: HubPendingPublishApproval | null = null;

export type HubPendingPublishApproval = {
  readonly platformId: string;
  readonly utterance: string;
  readonly gate: PublishGateResult;
  readonly atIso: string;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, JSON.stringify(value));
}

export function setPendingPublishApproval(
  input: Omit<HubPendingPublishApproval, "atIso">,
): HubPendingPublishApproval {
  const record: HubPendingPublishApproval = { ...input, atIso: new Date().toISOString() };
  memoryPendingPublish = record;
  writeJson(PENDING_PUBLISH_KEY, record);
  return record;
}

export function readPendingPublishApproval(): HubPendingPublishApproval | null {
  if (memoryPendingPublish) return memoryPendingPublish;
  memoryPendingPublish = readJson<HubPendingPublishApproval>(PENDING_PUBLISH_KEY);
  return memoryPendingPublish;
}

export function clearPendingPublishApproval(): void {
  memoryPendingPublish = null;
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_PUBLISH_KEY);
}
