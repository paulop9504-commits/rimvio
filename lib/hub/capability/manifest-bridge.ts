/**
 * Hub CapabilityDraft ↔ RimvioPlatformManifest bridge.
 * docs/RIMVIO_PLATFORM_SDK_SPEC.md · ADR-054
 */

import { validateManifestJson } from "@/lib/hub/capability/validation";
import { createDefaultCapabilityDraft } from "@/lib/hub/capability/defaults";
import type { CapabilityDraft } from "@/lib/hub/capability/types";
import {
  createDefaultMarketsDeclaration,
  synthesizeMarketsDeclaration,
} from "@/lib/platform-sdk/markets";
import {
  RIMVIO_PLATFORM_MANIFEST_VERSION,
  type RimvioPlatformManifest,
} from "@/lib/platform-sdk/types";

function slugToPlatformId(rawId: string): string {
  const trimmed = rawId.trim();
  if (trimmed.startsWith("platform.")) return trimmed;
  return `platform.${trimmed.replace(/\./g, "-")}`;
}

export function capabilityDraftToPlatformManifest(
  draft: CapabilityDraft,
): RimvioPlatformManifest {
  const platformId = slugToPlatformId(draft.id);
  const enabledPermissions = draft.permissions.filter((p) => p.enabled).map((p) => p.id);
  const disabledPermissions = draft.permissions.filter((p) => !p.enabled).map((p) => p.id);

  return {
    specVersion: RIMVIO_PLATFORM_MANIFEST_VERSION,
    package: {
      id: platformId,
      name: draft.name,
      version: draft.version,
      description: draft.description,
      category: draft.category,
      tags: [...draft.tags],
      pricing: draft.pricing,
      icon: draft.iconDataUrl,
    },
    operator: draft.operator,
    markets: synthesizeMarketsDeclaration(draft.markets),
    runtime: {
      tier: "native",
      type: draft.runtime.type,
      entry: draft.runtime.entry,
      hostVersion: ">=1.0.0",
    },
    permissions: {
      required: enabledPermissions,
      optional: [],
      denied: disabledPermissions,
    },
    context: {
      read: draft.selectedContext.map((c) => ({ path: c.path, type: c.type })),
      write: [],
    },
    data: {
      collections: [],
      isolation: "tenant_strict",
    },
    capabilities: draft.actions.map((action) => ({
      id: action.name.includes(".") ? action.name : `${platformId.split(".").slice(1).join(".")}.${action.name}`,
      name: action.description || action.name,
      description: action.description,
      inputSchema: action.inputSchema.includes(".v")
        ? action.inputSchema
        : `${action.inputSchema}.v1`,
      outputSchema: action.outputSchema.includes(".v")
        ? action.outputSchema
        : `${action.outputSchema}.v1`,
      approvalRequired: action.approvalRequired,
      markets: action.markets?.length ? [...action.markets] : undefined,
    })),
    ui: {
      routes: [
        { path: "/", surface: "page", component: "PlatformHome" },
        { path: "/action", surface: "page", component: "PlatformAction" },
      ],
    },
    composition: { imports: [] },
    events: {
      emits: draft.events.map((e) => e.name),
      subscribes: [],
    },
  };
}

export function platformManifestToCapabilityDraft(
  manifest: RimvioPlatformManifest,
  base?: CapabilityDraft,
): CapabilityDraft {
  const seed = base;
  const permissionIds = new Set([
    ...manifest.permissions.required,
    ...manifest.permissions.optional,
    ...manifest.permissions.denied,
  ]);

  const permissions =
    seed?.permissions.map((p) => ({
      ...p,
      enabled: manifest.permissions.required.includes(p.id),
    })) ??
    [...manifest.permissions.required, ...manifest.permissions.denied].map((id) => ({
      id,
      label: id,
      scope: "Read",
      whyNeeded: "Imported from manifest",
      risk: "medium" as const,
      enabled: manifest.permissions.required.includes(id),
    }));

  return {
    id: manifest.package.id.replace(/^platform\./, "").replace(/-/g, "."),
    name: manifest.package.name,
    version: manifest.package.version,
    description: manifest.package.description,
    category: manifest.package.category,
    tags: [...manifest.package.tags],
    iconDataUrl: manifest.package.icon,
    pricing: manifest.package.pricing,
    operator:
      manifest.operator ?? seed?.operator ?? createDefaultCapabilityDraft().operator,
    markets: synthesizeMarketsDeclaration(manifest.markets),
    wantsGlobal: seed?.wantsGlobal ?? false,
    manifestJson: JSON.stringify(
      {
        name: manifest.package.name,
        version: manifest.package.version,
        runtime: manifest.runtime,
        permissions: manifest.permissions.required,
        actions: manifest.capabilities.map((c) => c.id),
      },
      null,
      2,
    ),
    runtime: {
      type: manifest.runtime.type,
      entry: manifest.runtime.entry,
    },
    inputType: manifest.capabilities[0]?.inputSchema ?? "intent.v1",
    actions: manifest.capabilities.map((cap, i) => ({
      id: `action_${i + 1}`,
      name: cap.id,
      description: cap.description ?? cap.name,
      inputSchema: cap.inputSchema,
      outputSchema: cap.outputSchema,
      approvalRequired: cap.approvalRequired,
      markets: cap.markets ? [...cap.markets] : undefined,
    })),
    outputEvents: [...manifest.events.emits],
    approval: { before: manifest.capabilities.filter((c) => c.approvalRequired).map((c) => c.id) },
    permissions,
    selectedContext: manifest.context.read.map((c, i) => ({
      id: `ctx_${i}`,
      label: c.path,
      type: c.type,
      path: c.path,
    })),
    inputSchemaJson: seed?.inputSchemaJson ?? "{}",
    outputSchemaJson: seed?.outputSchemaJson ?? "{}",
    events: seed?.events ?? [],
    changelog: seed?.changelog ?? "",
    publishConsents: seed?.publishConsents ?? {
      rights: false,
      permissions: false,
      policy: false,
      tested: false,
    },
  };
}

export function exportPlatformManifestJson(draft: CapabilityDraft): string {
  return JSON.stringify(capabilityDraftToPlatformManifest(draft), null, 2);
}

export function parsePlatformManifestJson(raw: string): {
  manifest: RimvioPlatformManifest | null;
  error: string | null;
} {
  try {
    const parsed = JSON.parse(raw) as RimvioPlatformManifest;
    if (parsed.specVersion !== RIMVIO_PLATFORM_MANIFEST_VERSION) {
      return {
        manifest: null,
        error: `Unsupported specVersion: ${parsed.specVersion}`,
      };
    }
    return { manifest: parsed, error: null };
  } catch (e) {
    return {
      manifest: null,
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
}

export function importManifestIntoDraft(
  raw: string,
  base?: CapabilityDraft,
): { draft: CapabilityDraft | null; error: string | null } {
  const { manifest, error } = parsePlatformManifestJson(raw);
  if (!manifest || error) {
    return { draft: null, error: error ?? "Parse failed" };
  }
  const legacyCheck = validateManifestJson(
    JSON.stringify({
      name: manifest.package.name,
      version: manifest.package.version,
      runtime: manifest.runtime,
    }),
  );
  if (!legacyCheck.valid && legacyCheck.error) {
    // non-fatal — platform manifest is SSOT
  }
  return {
    draft: platformManifestToCapabilityDraft(manifest, base),
    error: null,
  };
}

export const HUB_PENDING_MANIFEST_STORAGE_KEY = "rimvio.hub.pending-manifest.v1";

export function stashPendingManifest(manifest: RimvioPlatformManifest): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HUB_PENDING_MANIFEST_STORAGE_KEY, JSON.stringify(manifest));
}

export function readPendingManifest(): RimvioPlatformManifest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(HUB_PENDING_MANIFEST_STORAGE_KEY);
    if (!raw) return null;
    const { manifest } = parsePlatformManifestJson(raw);
    return manifest;
  } catch {
    return null;
  }
}

export function clearPendingManifest(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HUB_PENDING_MANIFEST_STORAGE_KEY);
}
