/**
 * P2 — Workspace observation modules (Cursor-style read before act).
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import {
  observeHubWorkspace,
  observationLinesFromWorkspace,
  type HubWorkspaceFullState,
} from "@/lib/hub/dev/hub-workspace-observe";

export type WorkspaceObservation = HubWorkspaceFullState;

export type CapabilityObservation = {
  readonly names: readonly string[];
  readonly withApproval: readonly string[];
  readonly missingSchema: readonly string[];
};

export type WorkflowObservation = {
  readonly description: string;
  readonly steps: readonly string[];
};

export type ConnectionObservation = {
  readonly providers: Readonly<Record<string, { readonly connected: boolean; readonly verified: boolean }>>;
};

export type TestObservation = {
  readonly passed: number;
  readonly total: number;
  readonly failing: number;
  readonly ok: boolean;
};

export type FullWorkspaceObservation = {
  readonly platform: WorkspaceObservation;
  readonly capabilities: CapabilityObservation;
  readonly workflow: WorkflowObservation;
  readonly connections: ConnectionObservation;
  readonly tests: TestObservation;
  readonly lines: readonly string[];
};

export function observeWorkspace(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly connections?: Readonly<Record<string, boolean>>;
}): WorkspaceObservation {
  return observeHubWorkspace(input);
}

export function observeCapabilities(draft: PlatformDraft): CapabilityObservation {
  const names = draft.actions.map((a) => a.name);
  const withApproval = draft.actions.filter((a) => a.approvalRequired).map((a) => a.name);
  const missingSchema = draft.actions
    .filter((a) => !a.outputSchema.includes(".v"))
    .map((a) => a.name);
  return { names, withApproval, missingSchema };
}

export function observeWorkflow(draft: PlatformDraft): WorkflowObservation {
  const description = draft.workflowDescription?.trim() || "";
  const steps = description
    ? description.split(/→|->/).map((s) => s.trim()).filter(Boolean)
    : [];
  return { description: description || "none", steps };
}

export function observeConnections(
  connections: Readonly<Record<string, boolean>>,
): ConnectionObservation {
  const providers = Object.fromEntries(
    Object.entries(connections).map(([id, connected]) => [
      id,
      { connected, verified: connected },
    ]),
  );
  return { providers };
}

export function observeTests(snapshot: DevProjectSnapshot): TestObservation {
  const failing = Math.max(0, snapshot.testsTotal - snapshot.testsPassed);
  return {
    passed: snapshot.testsPassed,
    total: snapshot.testsTotal,
    failing,
    ok: failing === 0 && snapshot.testsTotal > 0,
  };
}

/** Aggregate all observers — SSOT for Agent Loop Observe stage. */
export function observeFullWorkspace(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly connections?: Readonly<Record<string, boolean>>;
}): FullWorkspaceObservation {
  const platform = observeWorkspace(input);
  const capabilities = observeCapabilities(input.draft);
  const workflow = observeWorkflow(input.draft);
  const connections = observeConnections(platform.connections);
  const tests = observeTests(input.snapshot);
  const lines = observationLinesFromWorkspace(platform);
  return { platform, capabilities, workflow, connections, tests, lines };
}
