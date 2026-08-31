/**
 * Mock adapter — persistent overlay, no Docker / Vercel /tmp workspace.
 * Real container/Postgres adapters implement the same interface later.
 */

import {
  resourcesOfType,
  upsertExperienceResource,
} from "@/lib/hub/dev/experience-os/resource-store";
import type { ResourceStatus } from "@/lib/hub/dev/experience-os/types";
import type {
  AuthProviderId,
  AuthProviderState,
  ExperienceRuntimeAdapter,
  RuntimeAdapterStatus,
  StorageObjectMeta,
  TableColumn,
} from "@/lib/hub/dev/experience-os/adapters/types";

function nowIso(): string {
  return new Date().toISOString();
}

function runtimeStatusFromStore(projectId: string): ResourceStatus {
  const current = resourcesOfType(projectId, "runtime")[0];
  return current?.status ?? "stopped";
}

function toRuntimeStatus(projectId: string, status: ResourceStatus): RuntimeAdapterStatus {
  return {
    status,
    framework: "Next.js",
    node: "22",
    port: 3000,
    process: status === "running" ? "next dev" : "idle",
    adapter: "mock",
  };
}

export const mockRuntimeAdapter: ExperienceRuntimeAdapter = {
  kind: "mock",
  async status(projectId) {
    return toRuntimeStatus(projectId, runtimeStatusFromStore(projectId));
  },
  async start(projectId) {
    upsertExperienceResource({
      id: "runtime:workspace",
      projectId,
      type: "runtime",
      name: "workspace",
      status: "running",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      meta: { adapter: "mock", process: "next dev", port: 3000 },
    });
    return toRuntimeStatus(projectId, "running");
  },
  async stop(projectId) {
    upsertExperienceResource({
      id: "runtime:workspace",
      projectId,
      type: "runtime",
      name: "workspace",
      status: "stopped",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      meta: { adapter: "mock", process: "idle" },
    });
    return toRuntimeStatus(projectId, "stopped");
  },
  async restart(projectId) {
    await this.stop(projectId);
    return this.start(projectId);
  },
};

const DEFAULT_PROVIDERS: readonly AuthProviderState[] = [
  { id: "email", enabled: true },
  { id: "google", enabled: true },
  { id: "apple", enabled: false },
  { id: "kakao", enabled: false },
];

export function readAuthProviders(projectId: string): readonly AuthProviderState[] {
  const stored = resourcesOfType(projectId, "auth_role").find((r) => r.name === "__providers");
  const raw = stored?.meta?.providers;
  if (Array.isArray(raw)) {
    return DEFAULT_PROVIDERS.map((p) => {
      const hit = (raw as AuthProviderState[]).find((x) => x.id === p.id);
      return hit ? { id: p.id, enabled: Boolean(hit.enabled) } : p;
    });
  }
  return DEFAULT_PROVIDERS;
}

export function writeAuthProvider(
  projectId: string,
  id: AuthProviderId,
  enabled: boolean,
): readonly AuthProviderState[] {
  const next = readAuthProviders(projectId).map((p) => (p.id === id ? { ...p, enabled } : p));
  upsertExperienceResource({
    id: "auth_role:__providers",
    projectId,
    type: "auth_role",
    name: "__providers",
    status: "ready",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    meta: { providers: next },
  });
  return next;
}

export function defaultColumnsForTable(table: string): TableColumn[] {
  const cols: TableColumn[] = [
    { name: "id", type: "uuid", required: true },
    { name: "created_at", type: "timestamp", required: true },
  ];
  if (table === "users" || table === "memberships") {
    cols.push({ name: "email", type: "text", required: true });
    cols.push({ name: "name", type: "text", required: true });
  } else if (/product|listing|menu|hotel|item/.test(table)) {
    cols.push({ name: "name", type: "text", required: true });
    cols.push({ name: "price", type: "number", required: true });
    cols.push({ name: "image", type: "file", required: false });
  } else if (/order|booking|payment/.test(table)) {
    cols.push({ name: "user_id", type: "relation", required: true });
    cols.push({ name: "amount", type: "number", required: true });
    cols.push({ name: "status", type: "text", required: true });
  } else {
    cols.push({ name: "name", type: "text", required: true });
  }
  return cols;
}

export function readTableColumns(projectId: string, table: string): TableColumn[] {
  const row = resourcesOfType(projectId, "database_table").find((r) => r.name === table);
  const raw = row?.meta?.columns;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as TableColumn[];
  }
  return defaultColumnsForTable(table);
}

export function writeTableColumns(
  projectId: string,
  table: string,
  columns: readonly TableColumn[],
): void {
  upsertExperienceResource({
    id: `database_table:${table}`,
    projectId,
    type: "database_table",
    name: table,
    status: "ready",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    meta: { columns },
  });
}

export function listStorageObjects(projectId: string, bucket: string): StorageObjectMeta[] {
  const row = resourcesOfType(projectId, "storage_bucket").find((r) => r.name === bucket);
  const raw = row?.meta?.objects;
  return Array.isArray(raw) ? (raw as StorageObjectMeta[]) : [];
}

export function writeStorageObjects(
  projectId: string,
  bucket: string,
  objects: readonly StorageObjectMeta[],
  extra?: Record<string, unknown>,
): void {
  upsertExperienceResource({
    id: `storage_bucket:${bucket}`,
    projectId,
    type: "storage_bucket",
    name: bucket,
    status: "ready",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    meta: { objects, public: extra?.public === true, ...extra },
  });
}
