/**
 * Hub Workspace Observe — 8-axis platform state SSOT for Hub Agent.
 * Capabilities · Schema · Data · Workflow · Permissions · Runtime · Connections · Tests
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { buildDevBlueprintModel } from "@/lib/hub/dev/dev-blueprint-model";

export type HubWorkspaceAxis =
  | "capabilities"
  | "schema"
  | "data"
  | "workflow"
  | "permissions"
  | "runtime"
  | "connections"
  | "tests";

export type HubWorkspaceFullState = {
  readonly platformName: string;
  readonly capabilities: readonly string[];
  readonly schemaReady: readonly string[];
  readonly schemaMissing: readonly string[];
  readonly dataEntities: readonly string[];
  readonly workflow: string;
  readonly permissions: readonly string[];
  readonly runtime: readonly string[];
  readonly connections: Readonly<Record<string, boolean>>;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly testsFailing: number;
  readonly issuesCount: number;
  readonly commerce: string;
};

export function observeHubWorkspace(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly connections?: Readonly<Record<string, boolean>>;
}): HubWorkspaceFullState {
  const { draft, snapshot } = input;
  const blueprint = buildDevBlueprintModel({ draft, snapshot });
  const capabilities = draft.actions.map((a) => a.name);

  const schemaReady = draft.actions
    .filter((a) => a.inputSchema.length > 2 && a.outputSchema.includes(".v"))
    .map((a) => a.name);
  const schemaMissing = draft.actions
    .filter((a) => !schemaReady.includes(a.name))
    .map((a) => a.name);

  const conn = {
    github: input.connections?.github ?? false,
    openai: input.connections?.openai ?? false,
    stripe: input.connections?.stripe ?? false,
    vercel: input.connections?.vercel ?? false,
    supabase: input.connections?.supabase ?? false,
    mcp: input.connections?.mcp ?? false,
  };

  const testsFailing = Math.max(0, snapshot.testsTotal - snapshot.testsPassed);

  return {
    platformName: draft.name || "New Platform",
    capabilities,
    schemaReady,
    schemaMissing,
    dataEntities: blueprint.dataEntities,
    workflow: draft.workflowDescription?.trim() || blueprint.workflows.join(" → ") || "none",
    permissions: draft.permissions.filter((p) => p.enabled).map((p) => p.id),
    runtime: blueprint.runtimes,
    connections: conn,
    testsPassed: snapshot.testsPassed,
    testsTotal: snapshot.testsTotal,
    testsFailing,
    issuesCount: snapshot.issuesCount,
    commerce: draft.commerceNotes?.trim() || "None",
  };
}

/** Cursor-style observation lines for Operator UI. */
export function observationLinesFromWorkspace(state: HubWorkspaceFullState): string[] {
  const connParts = Object.entries(state.connections)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const missingConn = !state.connections.stripe ? "Stripe disconnected" : null;

  const lines = [
    `Platform: ${state.platformName}`,
    `Capabilities (${state.capabilities.length}): ${state.capabilities.join(", ") || "none"}`,
    `Schema ready: ${state.schemaReady.join(", ") || "none"}`,
    state.schemaMissing.length
      ? `Schema missing: ${state.schemaMissing.join(", ")}`
      : "Schema: all capabilities covered",
    `Data: ${state.dataEntities.join(", ") || "none"}`,
    `Workflow: ${state.workflow}`,
    `Permissions: ${state.permissions.join(", ") || "none"}`,
    `Runtime: ${state.runtime.join(", ") || "none"}`,
    `Connections: ${connParts.join(", ") || "none"}${missingConn ? ` · ${missingConn}` : ""}`,
    `Tests: ${state.testsPassed}/${state.testsTotal}${state.testsFailing ? ` (${state.testsFailing} failing)` : ""}`,
    `Issues: ${state.issuesCount}`,
  ];
  return lines;
}

/** One-line executive summary for Agent work log. */
export function summarizeHubWorkspace(state: HubWorkspaceFullState): string {
  const parts: string[] = [];
  if (state.capabilities.length) {
    parts.push(`${state.capabilities.length} caps`);
  }
  if (!state.connections.stripe && state.capabilities.some((c) => c.includes("payment"))) {
    parts.push("Stripe disconnected");
  }
  if (state.testsFailing) {
    parts.push(`${state.testsFailing} tests failing`);
  }
  if (state.schemaMissing.length) {
    parts.push(`${state.schemaMissing.length} schema gaps`);
  }
  return parts.length ? parts.join(" · ") : "empty platform";
}
