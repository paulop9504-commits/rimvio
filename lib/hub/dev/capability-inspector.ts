import type { CapabilityAction, CapabilityPermission } from "@/lib/hub/capability/types";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import type { PlatformDraft } from "@/lib/hub/platform/types";

export type CapabilityInspectorView = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly runtime: string;
  readonly status: "ready" | "draft" | "needs-test";
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly permissions: readonly CapabilityPermission[];
  readonly contextPaths: readonly string[];
  readonly sideEffect: string;
  readonly financialWarning: boolean;
  readonly manifestSnippet: string;
};

const ACTION_PERMISSION_HINTS: Record<string, readonly string[]> = {
  "hotel.search": ["location.read", "external_network.read"],
  "hotel.detail": ["external_network.read"],
  "room.availability": ["external_network.read", "booking.write"],
  "booking.prepare": ["booking.write"],
  "booking.confirm": ["booking.write"],
  "booking.cancel": ["booking.write"],
  "payment.prepare": ["payment.prepare", "booking.write"],
  "payment.commit": ["payment.prepare", "booking.write"],
};

function parseSchemaFields(schema: string): string[] {
  if (!schema) return [];
  if (schema.includes(".")) {
    const base = schema.split(".")[0] ?? schema;
    if (base.includes("search") || base.includes("hotel")) {
      return ["destination", "checkIn", "checkOut", "guests"];
    }
    if (base.includes("payment")) return ["amount", "currency", "bookingId"];
    if (base.includes("booking")) return ["hotelId", "roomId", "guests"];
  }
  return [schema];
}

export function inferPermissionsForAction(
  action: CapabilityAction,
  draft: PlatformDraft,
): CapabilityPermission[] {
  const hints = ACTION_PERMISSION_HINTS[action.name] ?? [];
  const enabled = draft.permissions.filter((p) => p.enabled);
  if (hints.length === 0) return enabled;

  const matched = enabled.filter((p) => hints.includes(p.id));
  return matched.length > 0 ? matched : enabled;
}

export function inferContextForAction(
  action: CapabilityAction,
  draft: PlatformDraft,
): readonly string[] {
  if (action.name.startsWith("hotel.") || action.name.startsWith("booking.")) {
    return draft.selectedContext.map((c) => c.path);
  }
  if (action.name.startsWith("payment.")) {
    return ["bookingId", "amount", "currency"];
  }
  return draft.selectedContext.map((c) => c.path);
}

export function buildCapabilityManifestSnippet(
  action: CapabilityAction,
  draft: PlatformDraft,
): string {
  const manifest = capabilityDraftToPlatformManifest(draft);
  const cap = manifest.capabilities.find(
    (c) => c.id === action.name || c.id.endsWith(action.name),
  );
  return JSON.stringify(
    {
      capability: cap ?? {
        id: action.name,
        name: action.description,
        inputSchema: action.inputSchema,
        outputSchema: action.outputSchema,
        approvalRequired: action.approvalRequired,
      },
      permissions: inferPermissionsForAction(action, draft).map((p) => p.id),
      context: inferContextForAction(action, draft),
    },
    null,
    2,
  );
}

export function buildCapabilityInspectorView(
  action: CapabilityAction,
  draft: PlatformDraft,
  testsPassed: boolean,
): CapabilityInspectorView {
  const financial =
    action.name.includes("payment.commit") ||
    action.name.includes("payment.prepare") ||
    (action.approvalRequired && action.name.includes("payment"));

  let sideEffect = "None";
  if (financial) {
    sideEffect = "⚠ FINANCIAL SIDE EFFECT — Requires user approval";
  } else if (action.approvalRequired) {
    sideEffect = "Prepare / Commit required";
  } else if (action.name.includes("booking.write") || action.name.startsWith("booking.")) {
    sideEffect = "State mutation — booking domain";
  }

  const status: CapabilityInspectorView["status"] = testsPassed
    ? "ready"
    : draft.manifestJson
      ? "needs-test"
      : "draft";

  return {
    id: action.id,
    name: action.name,
    description: action.description,
    version: draft.version,
    runtime: `${draft.runtimeTier} · ${draft.runtime.type}`,
    status,
    inputs: parseSchemaFields(action.inputSchema),
    outputs: action.outputSchema.endsWith("[]") || action.name.includes("search")
      ? [`${action.name.split(".")[1] ?? "result"}[]`]
      : [action.outputSchema],
    permissions: inferPermissionsForAction(action, draft),
    contextPaths: inferContextForAction(action, draft),
    sideEffect,
    financialWarning: financial,
    manifestSnippet: buildCapabilityManifestSnippet(action, draft),
  };
}

export function syncPlatformManifestJson(draft: PlatformDraft): string {
  return JSON.stringify(capabilityDraftToPlatformManifest(draft), null, 2);
}
