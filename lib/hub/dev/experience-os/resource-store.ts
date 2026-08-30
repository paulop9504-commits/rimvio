/**
 * Experience resource overlay — session persistence, no parallel DB.
 * Secrets store only names + set-at, never plaintext values.
 */

import type { RimvioResource } from "@/lib/hub/dev/experience-os/types";

const KEY = "rimvio-experience-resources";

type StoreShape = Record<string, RimvioResource[]>;

function readAll(): StoreShape {
  if (typeof window === "undefined") return memory;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return memory;
    memory = JSON.parse(raw) as StoreShape;
    return memory;
  } catch {
    return memory;
  }
}

let memory: StoreShape = {};

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* quota */
  }
}

export function listExperienceResources(projectId: string): readonly RimvioResource[] {
  return readAll()[projectId] ?? [];
}

export function upsertExperienceResource(resource: RimvioResource): RimvioResource {
  const all = readAll();
  const list = [...(all[resource.projectId] ?? [])];
  const idx = list.findIndex((r) => r.id === resource.id);
  if (idx >= 0) list[idx] = resource;
  else list.push(resource);
  memory = { ...all, [resource.projectId]: list };
  persist();
  return resource;
}

export function resourcesOfType(
  projectId: string,
  type: RimvioResource["type"],
): readonly RimvioResource[] {
  return listExperienceResources(projectId).filter((r) => r.type === type);
}

export function appendExperienceLog(
  projectId: string,
  message: string,
  extra?: Record<string, unknown>,
): RimvioResource {
  const now = new Date().toISOString();
  return upsertExperienceResource({
    id: `log_event:${now}:${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    type: "log_event",
    name: message,
    status: "ready",
    createdAt: now,
    updatedAt: now,
    meta: extra,
  });
}

export function resetExperienceResources(): void {
  memory = {};
}
