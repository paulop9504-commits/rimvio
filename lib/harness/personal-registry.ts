/**
 * Personal-account Harness registry — owner isolation + enabled on/off.
 * Durable store = Supabase `user_harnesses` (RLS). localStorage remains draft cache.
 */

import type { Harness } from "@/lib/rimvio-protocol/harness/schema";
import { validateHarness } from "@/lib/harness/validate";

export const USER_HARNESS_LIBRARY_STATUSES = ["draft", "published"] as const;
export type UserHarnessLibraryStatus = (typeof USER_HARNESS_LIBRARY_STATUSES)[number];

export const USER_HARNESS_VISIBILITIES = ["private", "public"] as const;
export type UserHarnessVisibility = (typeof USER_HARNESS_VISIBILITIES)[number];

export type UserHarnessRecord = {
  id: string;
  userId: string;
  harnessId: string;
  harness: Harness;
  enabled: boolean;
  status: UserHarnessLibraryStatus;
  visibility: UserHarnessVisibility;
  createdAt: string;
  updatedAt: string;
};

export type UserHarnessUpsertInput = {
  harness: Harness;
  enabled?: boolean;
  status?: UserHarnessLibraryStatus;
  visibility?: UserHarnessVisibility;
};

export type UserHarnessPatchInput = {
  harness?: Harness;
  enabled?: boolean;
  status?: UserHarnessLibraryStatus;
  visibility?: UserHarnessVisibility;
};

export function isUserHarnessLibraryStatus(value: unknown): value is UserHarnessLibraryStatus {
  return value === "draft" || value === "published";
}

export function isUserHarnessVisibility(value: unknown): value is UserHarnessVisibility {
  return value === "private" || value === "public";
}

/** Runtime may run only when owner-enabled and schema-valid. */
export function canExecutePersonalHarness(record: Pick<UserHarnessRecord, "enabled" | "harness">): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!record.enabled) {
    issues.push("harness_disabled");
  }
  const checked = validateHarness(record.harness);
  if (!checked.ok) {
    issues.push(...checked.issues.map((i) => i.message));
  }
  return { ok: issues.length === 0, issues };
}

export function parseUserHarnessUpsertBody(body: unknown):
  | { ok: true; input: UserHarnessUpsertInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_json" };
  }
  const row = body as Record<string, unknown>;
  const checked = validateHarness(row.harness);
  if (!checked.ok) {
    return { ok: false, error: checked.issues.map((i) => i.message).join("; ") };
  }
  const status = row.status;
  if (status !== undefined && !isUserHarnessLibraryStatus(status)) {
    return { ok: false, error: "invalid_status" };
  }
  const visibility = row.visibility;
  if (visibility !== undefined && !isUserHarnessVisibility(visibility)) {
    return { ok: false, error: "invalid_visibility" };
  }
  if (row.enabled !== undefined && typeof row.enabled !== "boolean") {
    return { ok: false, error: "invalid_enabled" };
  }
  return {
    ok: true,
    input: {
      harness: checked.harness,
      enabled: typeof row.enabled === "boolean" ? row.enabled : true,
      status: isUserHarnessLibraryStatus(status) ? status : "draft",
      visibility: isUserHarnessVisibility(visibility) ? visibility : "private",
    },
  };
}

export function parseUserHarnessPatchBody(body: unknown):
  | { ok: true; patch: UserHarnessPatchInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_json" };
  }
  const row = body as Record<string, unknown>;
  const patch: UserHarnessPatchInput = {};

  if ("harness" in row) {
    const checked = validateHarness(row.harness);
    if (!checked.ok) {
      return { ok: false, error: checked.issues.map((i) => i.message).join("; ") };
    }
    patch.harness = checked.harness;
  }
  if ("enabled" in row) {
    if (typeof row.enabled !== "boolean") {
      return { ok: false, error: "invalid_enabled" };
    }
    patch.enabled = row.enabled;
  }
  if ("status" in row) {
    if (!isUserHarnessLibraryStatus(row.status)) {
      return { ok: false, error: "invalid_status" };
    }
    patch.status = row.status;
  }
  if ("visibility" in row) {
    if (!isUserHarnessVisibility(row.visibility)) {
      return { ok: false, error: "invalid_visibility" };
    }
    patch.visibility = row.visibility;
  }

  if (
    patch.harness === undefined &&
    patch.enabled === undefined &&
    patch.status === undefined &&
    patch.visibility === undefined
  ) {
    return { ok: false, error: "empty_patch" };
  }

  return { ok: true, patch };
}
