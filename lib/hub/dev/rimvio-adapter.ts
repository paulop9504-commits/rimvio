/**
 * Rimvio Adapter Layer — Developer API → Capability + Canonical Schema (SSOT).
 * Dev는 Rimvio Schema를 공부할 필요 없음; Adapter가 포장한다.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { CapabilityAction } from "@/lib/hub/capability/types";

export type ApiEndpointSpec = {
  readonly method: string;
  readonly path: string;
  readonly summary?: string;
  readonly requestFields?: readonly string[];
  readonly responseFields?: readonly string[];
};

export type InferredPermissionRisk = "read" | "write" | "financial" | "account" | "destructive";

export type AdaptedCapability = {
  readonly capabilityId: string;
  readonly label: string;
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly approvalRequired: boolean;
  readonly risk: InferredPermissionRisk;
  readonly sourceEndpoint?: string;
  readonly inputFields: readonly string[];
  readonly outputFields: readonly string[];
};

export type AdapterResult = {
  readonly capabilities: readonly AdaptedCapability[];
  readonly permissionSummary: Readonly<Record<InferredPermissionRisk, number>>;
  readonly canonicalObjects: readonly string[];
};

function inferRisk(method: string, path: string): InferredPermissionRisk {
  const m = method.toUpperCase();
  const p = path.toLowerCase();
  if (/payment|pay|checkout|billing|charge/.test(p)) return "financial";
  if (/account|profile|auth|user/.test(p) && m !== "GET") return "account";
  if (m === "DELETE") return "destructive";
  if (m === "GET" || m === "HEAD") return "read";
  return "write";
}

function capabilityIdFromEndpoint(method: string, path: string): string {
  const m = method.toUpperCase();
  const segments = path
    .split("/")
    .filter(Boolean)
    .map((s) => s.replace(/^:/, "").replace(/[{}]/g, ""));
  const resource = segments.find((s) => !/^(api|v\d+)$/i.test(s)) ?? "resource";
  const action =
    m === "GET" && segments.length > 1 && segments[segments.length - 1]?.startsWith(":")
      ? "detail"
      : m === "GET"
        ? "search"
        : m === "POST" && /search|query/.test(path)
          ? "search"
          : m === "POST"
            ? segments[segments.length - 1] === resource
              ? "create"
              : "action"
            : m === "PUT" || m === "PATCH"
              ? "update"
              : m === "DELETE"
                ? "delete"
                : "action";
  const domain = resource.replace(/s$/, "");
  return `${domain}.${action}`.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
}

function schemaFamily(capabilityId: string, kind: "input" | "output"): string {
  const base = capabilityId.replace(/\./g, "_");
  return kind === "input" ? `${base}.input.v1` : `${base}.output.v1`;
}

/** REST/OpenAPI-style endpoints → Rimvio Capabilities + permission inference. */
export function adaptApiEndpoints(endpoints: readonly ApiEndpointSpec[]): AdapterResult {
  const capabilities: AdaptedCapability[] = [];
  const permissionSummary: Record<InferredPermissionRisk, number> = {
    read: 0,
    write: 0,
    financial: 0,
    account: 0,
    destructive: 0,
  };

  for (const ep of endpoints) {
    const risk = inferRisk(ep.method, ep.path);
    permissionSummary[risk] += 1;
    const capabilityId = capabilityIdFromEndpoint(ep.method, ep.path);
    capabilities.push({
      capabilityId,
      label: ep.summary ?? capabilityId.replace(/\./g, " "),
      inputSchema: schemaFamily(capabilityId, "input"),
      outputSchema: schemaFamily(capabilityId, "output"),
      approvalRequired: risk === "financial" || risk === "destructive" || risk === "account",
      risk,
      sourceEndpoint: `${ep.method.toUpperCase()} ${ep.path}`,
      inputFields: ep.requestFields ?? [],
      outputFields: ep.responseFields ?? [],
    });
  }

  const canonicalObjects = [
    ...new Set(
      capabilities.flatMap((c) => c.outputFields.filter((f) => !f.endsWith("[]"))),
    ),
  ].slice(0, 12);

  return {
    capabilities: dedupeCapabilities(capabilities),
    permissionSummary,
    canonicalObjects: canonicalObjects.length ? canonicalObjects : ["items", "price", "seller"],
  };
}

function dedupeCapabilities(list: AdaptedCapability[]): AdaptedCapability[] {
  const byId = new Map<string, AdaptedCapability>();
  for (const cap of list) {
    if (!byId.has(cap.capabilityId)) byId.set(cap.capabilityId, cap);
  }
  return [...byId.values()];
}

/** Adapted capabilities → PlatformDraft actions (Dev가 수동 작성하지 않음). */
export function adaptedCapabilitiesToDraftActions(
  capabilities: readonly AdaptedCapability[],
): CapabilityAction[] {
  return capabilities.map((cap, i) => ({
    id: `auto-${i + 1}`,
    name: cap.capabilityId,
    description: cap.label,
    inputSchema: cap.inputSchema,
    outputSchema: cap.outputSchema,
    approvalRequired: cap.approvalRequired,
  }));
}

export function mergeAdapterIntoDraft(
  draft: PlatformDraft,
  adapter: AdapterResult,
): PlatformDraft {
  return {
    ...draft,
    actions: adaptedCapabilitiesToDraftActions(adapter.capabilities),
    permissions: adapter.capabilities
      .filter((c) => c.risk !== "read")
      .map((c, i) => ({
        id: `perm-${i + 1}`,
        label: c.capabilityId,
        scope:
          c.risk === "financial"
            ? "Payment"
            : c.risk === "destructive"
              ? "Delete"
              : c.risk === "account"
                ? "Account"
                : "Write",
        whyNeeded: c.sourceEndpoint ?? c.label,
        risk:
          c.risk === "financial" || c.risk === "destructive"
            ? "critical"
            : c.risk === "account"
              ? "high"
              : "medium",
        enabled: true,
      })),
  };
}
