/**
 * Application State Snapshot — SSOT read, not memory.
 * Wraps observeHubWorkspace / inspectCurrentState.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { inspectCurrentState } from "@/lib/agent-os/agent-turn/inspect";
import type { AgentTurnUnderstand } from "@/lib/agent-os/agent-turn/types";
import type { ApplicationStateSnapshot } from "@/lib/agent-os/decision-engine/types";

export function snapshotApplicationState(input: {
  readonly draft: PlatformDraft;
  readonly snapshot: DevProjectSnapshot;
  readonly connections?: Readonly<Record<string, boolean>>;
  readonly understand?: AgentTurnUnderstand | null;
  readonly recentActions?: readonly string[];
  readonly recentObservations?: readonly string[];
  readonly pendingApprovals?: readonly string[];
}): ApplicationStateSnapshot {
  const inspect = inspectCurrentState({
    draft: input.draft,
    snapshot: input.snapshot,
    connections: input.connections,
    understand: input.understand,
  });

  let surfaces: string[] = [];
  try {
    const parsed = JSON.parse(input.draft.uiRoutesJson || "[]") as { path?: string }[];
    surfaces = parsed.map((r) => r.path ?? "").filter(Boolean);
  } catch {
    surfaces = [];
  }

  let infrastructure: string[] = [];
  try {
    const parsed = JSON.parse(input.draft.dataCollectionsJson || "[]") as { name?: string }[];
    infrastructure = parsed.map((c) => c.name ?? "").filter(Boolean);
  } catch {
    infrastructure = inspect.entities.slice();
  }

  return {
    application: inspect.platformName,
    entities: inspect.entities,
    capabilities: inspect.capabilities,
    missingCapabilities: inspect.missingCapabilities,
    infrastructure,
    surfaces,
    workflows: inspect.lines.filter((l) => /workflow|흐름|→/.test(l)).slice(0, 6),
    integrations: inspect.connections,
    tests: { passed: inspect.testsPassed, total: inspect.testsTotal },
    deployments: ["draft"],
    permissions: [],
    pendingApprovals: input.pendingApprovals ?? [],
    recentActions: input.recentActions ?? [],
    recentObservations: input.recentObservations ?? inspect.lines.slice(0, 8),
    lines: inspect.lines,
  };
}

export function capabilityPresent(state: ApplicationStateSnapshot, needle: string): boolean {
  const n = needle.toLowerCase().replace(/_exists$/, "").replace(/_/g, ".");
  return (
    state.capabilities.some((c) => c.toLowerCase().includes(n) || n.includes(c.toLowerCase())) ||
    state.entities.some((e) => e.toLowerCase().includes(n.split(".")[0] ?? n))
  );
}
