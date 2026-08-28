import type { CapabilityAction, CapabilityPermission } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { syncPlatformManifestJson } from "@/lib/hub/dev/capability-inspector";

export type CapabilitySnippet = {
  capability?: {
    id?: string;
    name?: string;
    description?: string;
    inputSchema?: string;
    outputSchema?: string;
    approvalRequired?: boolean;
  };
  permissions?: string[];
  context?: string[];
};

export type DiffLine = {
  readonly type: "add" | "remove" | "same";
  readonly line: string;
};

export type CapabilityPatchPreview = {
  readonly valid: boolean;
  readonly error?: string;
  readonly diff: readonly DiffLine[];
  readonly snippet: CapabilitySnippet | null;
  readonly expandsPermissions: boolean;
  readonly newPermissionIds: readonly string[];
};

export function parseCapabilitySnippet(
  raw: string,
): { ok: true; snippet: CapabilitySnippet } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as CapabilitySnippet;
    if (!parsed.capability && !parsed.permissions && !parsed.context) {
      return { ok: false, error: "Expected capability, permissions, or context fields." };
    }
    return { ok: true, snippet: parsed };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
}

export function computeJsonLineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const max = Math.max(a.length, b.length);
  const lines: DiffLine[] = [];

  for (let i = 0; i < max; i++) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      if (left !== undefined) lines.push({ type: "same", line: left });
    } else {
      if (left !== undefined) lines.push({ type: "remove", line: left });
      if (right !== undefined) lines.push({ type: "add", line: right });
    }
  }
  return lines;
}

export function previewCapabilityPatch(
  beforeRaw: string,
  afterRaw: string,
  draft: PlatformDraft,
): CapabilityPatchPreview {
  const parsed = parseCapabilitySnippet(afterRaw);
  if (!parsed.ok) {
    return {
      valid: false,
      error: parsed.error,
      diff: [],
      snippet: null,
      expandsPermissions: false,
      newPermissionIds: [],
    };
  }

  const enabled = new Set(draft.permissions.filter((p) => p.enabled).map((p) => p.id));
  const proposed = parsed.snippet.permissions ?? [];
  const newPermissionIds = proposed.filter((id) => !enabled.has(id));

  return {
    valid: true,
    diff: computeJsonLineDiff(beforeRaw, afterRaw),
    snippet: parsed.snippet,
    expandsPermissions: newPermissionIds.length > 0,
    newPermissionIds,
  };
}

function permissionFromId(id: string): CapabilityPermission {
  const risk =
    id.includes("payment") || id.includes("commit")
      ? ("critical" as const)
      : id.includes("write")
        ? ("high" as const)
        : id.includes("network")
          ? ("medium" as const)
          : ("low" as const);

  return {
    id,
    label: id,
    scope: id.includes("write") || id.includes("commit") ? "Write" : "Read",
    whyNeeded: `Declared for capability patch`,
    risk,
    enabled: true,
  };
}

export function applyCapabilitySnippetPatch(
  draft: PlatformDraft,
  actionId: string,
  snippet: CapabilitySnippet,
  options?: { allowPermissionExpand?: boolean },
): { draft: PlatformDraft; error?: string } {
  const action = draft.actions.find((a) => a.id === actionId);
  if (!action) {
    return { draft, error: "Capability not found" };
  }

  const enabled = new Set(draft.permissions.filter((p) => p.enabled).map((p) => p.id));
  const proposed = snippet.permissions ?? [];
  const newIds = proposed.filter((id) => !enabled.has(id));
  if (newIds.length > 0 && !options?.allowPermissionExpand) {
    return {
      draft,
      error: `Permission expansion requires approval: ${newIds.join(", ")}`,
    };
  }

  let permissions = [...draft.permissions];
  for (const id of newIds) {
    if (!permissions.some((p) => p.id === id)) {
      permissions = [...permissions, permissionFromId(id)];
    } else {
      permissions = permissions.map((p) => (p.id === id ? { ...p, enabled: true } : p));
    }
  }

  let selectedContext = [...draft.selectedContext];
  if (snippet.context?.length) {
    for (const path of snippet.context) {
      if (!selectedContext.some((c) => c.path === path)) {
        selectedContext = [
          ...selectedContext,
          {
            id: `ctx_${path.replace(/\W/g, "_")}`,
            label: path,
            type: "string",
            path,
          },
        ];
      }
    }
  }

  const cap = snippet.capability;
  const nextAction: CapabilityAction = {
    ...action,
    name: cap?.id ?? action.name,
    description: cap?.name ?? cap?.description ?? action.description,
    inputSchema: cap?.inputSchema ?? action.inputSchema,
    outputSchema: cap?.outputSchema ?? action.outputSchema,
    approvalRequired: cap?.approvalRequired ?? action.approvalRequired,
  };

  const nextDraft: PlatformDraft = {
    ...draft,
    actions: draft.actions.map((a) => (a.id === actionId ? nextAction : a)),
    permissions,
    selectedContext,
  };

  return {
    draft: {
      ...nextDraft,
      manifestJson: syncPlatformManifestJson(nextDraft),
    },
  };
}
