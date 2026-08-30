/**
 * Activity timeline — 사용자가 Agent를 통해 한 행동 기록.
 */

import type { ActivityRecord } from "@/lib/experience-app/surface-types";

const KEY = "rimvio.experience-app.activity.v1";

let activityMemory: ActivityRecord[] = [];

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function persist(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(activityMemory));
    window.dispatchEvent(new CustomEvent("rimvio:experience-activity"));
  } catch {
    /* quota */
  }
}

export function listActivities(): readonly ActivityRecord[] {
  if (!canUseStorage()) return [...activityMemory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [...activityMemory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    activityMemory = JSON.parse(raw) as ActivityRecord[];
    return [...activityMemory].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [...activityMemory];
  }
}

export function upsertActivity(record: ActivityRecord): void {
  const existing = listActivities();
  const idx = existing.findIndex((a) => a.id === record.id);
  if (idx >= 0) {
    const copy = [...existing];
    copy[idx] = record;
    activityMemory = copy;
  } else {
    activityMemory = [record, ...existing];
  }
  persist();
}

export function getActivityByOrderId(orderId: string): ActivityRecord | null {
  return listActivities().find((a) => a.orderId === orderId) ?? null;
}

export function subscribeActivities(listener: () => void): () => void {
  if (!canUseStorage()) return () => {};
  window.addEventListener("rimvio:experience-activity", listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener("rimvio:experience-activity", listener);
    window.removeEventListener("storage", listener);
  };
}

export function resetActivities(): void {
  activityMemory = [];
  if (canUseStorage()) window.localStorage.removeItem(KEY);
}
