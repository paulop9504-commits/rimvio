/**
 * Platform ↔ Source mapping (P2).
 * Capability / Workflow / Schema → virtual source paths.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { parseWorkflowGraph } from "@/lib/hub/dev/workflow-graph";

export type PlatformSourceKind = "capability" | "schema" | "workflow" | "permission" | "connection" | "ui" | "test";

export type PlatformSourceRef = {
  readonly kind: PlatformSourceKind;
  readonly id: string;
  readonly label: string;
  readonly paths: readonly string[];
};

function capPath(name: string): string {
  return `src/capabilities/${name.replace(/\./g, "/")}.ts`;
}

function schemaPath(name: string): string {
  return `src/schemas/${name.replace(/\./g, "_")}.schema.ts`;
}

function workflowPath(draft: PlatformDraft): string {
  return `src/workflows/${(draft.name || "platform").toLowerCase().replace(/\s+/g, "-")}.workflow.ts`;
}

function permissionPath(scope: string): string {
  return `src/permissions/${scope.replace(/\./g, "_")}.policy.ts`;
}

function connectionPath(provider: string): string {
  return `src/connections/${provider}.adapter.ts`;
}

function uiPath(capability: string): string {
  const short = capability.split(".").pop() ?? capability;
  return `src/ui/${short}.tsx`;
}

/** Build full Platform → source map from draft. */
export function buildPlatformSourceMap(draft: PlatformDraft): readonly PlatformSourceRef[] {
  const refs: PlatformSourceRef[] = [];

  for (const action of draft.actions) {
    refs.push({
      kind: "capability",
      id: action.name,
      label: action.name,
      paths: [capPath(action.name), schemaPath(action.name)],
    });
    refs.push({
      kind: "schema",
      id: `${action.name}.schema`,
      label: `${action.name} schema`,
      paths: [schemaPath(action.name)],
    });
    refs.push({
      kind: "ui",
      id: `${action.name}.ui`,
      label: `${action.name} UI`,
      paths: [uiPath(action.name)],
    });
  }

  const graph = parseWorkflowGraph(draft);
  if (graph.nodes.length > 0) {
    refs.push({
      kind: "workflow",
      id: graph.name,
      label: graph.name,
      paths: [workflowPath(draft)],
    });
  }

  for (const perm of draft.permissions) {
    refs.push({
      kind: "permission",
      id: perm.id,
      label: perm.label,
      paths: [permissionPath(perm.scope)],
    });
  }

  if (draft.actions.some((a) => a.name.includes("payment"))) {
    refs.push({
      kind: "connection",
      id: "stripe",
      label: "Stripe",
      paths: [connectionPath("stripe"), "src/adapter/payment.ts"],
    });
  }

  refs.push({
    kind: "test",
    id: "sandbox",
    label: "Sandbox tests",
    paths: ["src/tests/sandbox.test.ts"],
  });

  return refs;
}

/** Resolve source paths for a capability id (e.g. hotel.search). */
export function sourcePathsForCapability(
  draft: PlatformDraft,
  capabilityId: string,
): readonly string[] {
  const map = buildPlatformSourceMap(draft);
  const hit = map.find((r) => r.kind === "capability" && r.id === capabilityId);
  return hit?.paths ?? [capPath(capabilityId), schemaPath(capabilityId)];
}

/** Find platform objects related to utterance keywords. */
export function findRelatedSourceRefs(input: {
  readonly draft: PlatformDraft;
  readonly keywords: readonly string[];
}): readonly PlatformSourceRef[] {
  const map = buildPlatformSourceMap(input.draft);
  const lower = input.keywords.map((k) => k.toLowerCase());
  return map.filter((ref) => {
    const hay = `${ref.id} ${ref.label} ${ref.paths.join(" ")}`.toLowerCase();
    return lower.some((k) => hay.includes(k));
  });
}
