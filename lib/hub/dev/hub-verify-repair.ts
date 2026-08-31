/**
 * P5 — Generic verify-repair: issue graph → auto patch plan.
 * Replaces hardcoded payment.commit repair in hub-agent-loop.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { DevProjectIssue, DevProjectSnapshot } from "@/lib/hub/dev/dev-project-state";
import { deriveProjectIssues } from "@/lib/hub/dev/dev-project-state";
import {
  analyzeErrors,
  rootCauseAnalysis,
  errorsToIssueNodes,
} from "@/lib/hub/dev/hub-error-analysis";
import type { HubAgentPlanStep } from "@/lib/hub/dev/hub-agent-loop";
import type { HubWorkspaceToolId } from "@/lib/hub/dev/hub-workspace-tools";
import { syncPlatformManifestJson } from "@/lib/hub/dev/capability-inspector";

export type HubIssueKind =
  | "schema"
  | "approval"
  | "manifest"
  | "auth"
  | "test"
  | "tool"
  | "preview";

export type HubIssueNode = {
  readonly id: string;
  readonly kind: HubIssueKind;
  readonly severity: "error" | "warning";
  readonly title: string;
  readonly detail: string;
  readonly capabilityId?: string;
  readonly fixToolId: HubWorkspaceToolId;
  readonly fixArgs: Readonly<Record<string, unknown>>;
  readonly dependsOn?: readonly string[];
};

export type HubIssueGraph = {
  readonly nodes: readonly HubIssueNode[];
  /** Issues that should be repaired first (errors before warnings). */
  readonly rootCauseIds: readonly string[];
};

export type VerifyRepairInput = {
  readonly draft: PlatformDraft;
  readonly snapshot?: DevProjectSnapshot;
  readonly testFailed?: boolean;
  readonly testDetail?: string;
  readonly toolError?: string;
  readonly previewFailed?: boolean;
};

export type VerifyRepairPlan = {
  readonly graph: HubIssueGraph;
  readonly repairSteps: readonly HubAgentPlanStep[];
  readonly summaryKo: string;
  readonly rootCause?: import("@/lib/hub/dev/hub-error-analysis").RootCauseReport;
};

export type RegressionReport = {
  readonly detected: boolean;
  readonly removedCapabilities: readonly string[];
  readonly newIssues: readonly string[];
  readonly summaryKo: string;
};

/** Capability #77 — Detect regressions by comparing draft before/after repair. */
export function detectRegression(
  before: PlatformDraft,
  after: PlatformDraft,
): RegressionReport {
  const beforeCaps = new Set(before.actions.map((a) => a.name));
  const afterCaps = new Set(after.actions.map((a) => a.name));
  const removedCapabilities = [...beforeCaps].filter((c) => !afterCaps.has(c));

  const beforeIssues = deriveProjectIssues(before);
  const afterIssues = deriveProjectIssues(after);
  const beforeErrorIds = new Set(beforeIssues.filter((i) => i.severity === "error").map((i) => i.id));
  const newIssues = afterIssues
    .filter((i) => i.severity === "error" && !beforeErrorIds.has(i.id))
    .map((i) => i.title);

  const detected = removedCapabilities.length > 0 || newIssues.length > 0;
  const summaryKo = detected
    ? `회귀 감지: ${removedCapabilities.length ? `capability ${removedCapabilities.join(", ")} 제거` : ""}${newIssues.length ? ` · 신규 error ${newIssues.length}건` : ""}`
    : "회귀 없음";

  return { detected, removedCapabilities, newIssues, summaryKo };
}

function repairStep(
  id: string,
  label: string,
  toolId: HubWorkspaceToolId,
  args?: Record<string, unknown>,
): HubAgentPlanStep {
  return { id, label, toolId, args };
}

function issueFromProjectIssue(issue: DevProjectIssue): HubIssueNode | null {
  if (issue.detail.includes("response schema") || issue.detail.includes("schema")) {
    return {
      id: issue.id,
      kind: "schema",
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      capabilityId: issue.capabilityId,
      fixToolId: "schema.update",
      fixArgs: {
        capability: issue.capabilityId ?? issue.title,
        outputSchema: `${(issue.capabilityId ?? issue.title).replace(/\./g, "_")}.response.v1`,
      },
    };
  }

  if (issue.detail.includes("approvalRequired")) {
    return {
      id: issue.id,
      kind: "approval",
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      capabilityId: issue.capabilityId,
      fixToolId: "capability.update",
      fixArgs: { capability: issue.capabilityId, approvalRequired: true },
    };
  }

  if (issue.id === "issue-manifest" || issue.detail.includes("manifest")) {
    return {
      id: issue.id,
      kind: "manifest",
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      fixToolId: "file.patch",
      fixArgs: { syncManifest: true },
    };
  }

  if (issue.detail.includes("API key") || issue.title === "Authentication") {
    return {
      id: issue.id,
      kind: "auth",
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      capabilityId: issue.capabilityId,
      fixToolId: "connection.verify",
      fixArgs: { provider: "stripe" },
      dependsOn: issue.capabilityId ? [`issue-schema-${issue.capabilityId}`] : undefined,
    };
  }

  return null;
}

/** Build issue graph from draft state + runtime verification signals. */
export function buildIssueGraph(input: VerifyRepairInput): HubIssueGraph {
  const projectIssues = deriveProjectIssues(input.draft);
  const analyzed = analyzeErrors({
    issues: projectIssues,
    testFailed: input.testFailed,
    testDetail: input.testDetail,
    toolError: input.toolError,
  });
  const rca = rootCauseAnalysis(analyzed);
  const fromAnalysis = errorsToIssueNodes(analyzed);

  const nodes: HubIssueNode[] = [];
  const seen = new Set<string>();

  for (const node of fromAnalysis) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    nodes.push(node);
  }

  for (const issue of projectIssues) {
    const node = issueFromProjectIssue(issue);
    if (node && !seen.has(node.id)) {
      seen.add(node.id);
      nodes.push(node);
    }
  }

  if (input.previewFailed && !seen.has("issue-preview")) {
    nodes.push({
      id: "issue-preview",
      kind: "preview",
      severity: "warning",
      title: "Preview",
      detail: "Preview invoke failed",
      fixToolId: "preview.run",
      fixArgs: { retry: true },
    });
  }

  const errors = nodes.filter((n) => n.severity === "error");
  const warnings = nodes.filter((n) => n.severity === "warning");
  const rootOrder = rca.repairOrder.filter((id) => nodes.some((n) => n.id === id));
  const rootCauseIds = rootOrder.length ? rootOrder : [...errors, ...warnings].map((n) => n.id);

  return { nodes, rootCauseIds };
}

/** Topological-ish order: schema before auth, manifest early. */
function sortRepairOrder(nodes: readonly HubIssueNode[]): HubIssueNode[] {
  const priority: Record<HubIssueKind, number> = {
    manifest: 0,
    schema: 1,
    approval: 2,
    test: 3,
    tool: 4,
    auth: 5,
    preview: 6,
  };
  return [...nodes].sort((a, b) => priority[a.kind] - priority[b.kind]);
}

/** Convert issue graph → Hub Agent repair steps (+ retest). */
export function planRepairStepsFromGraph(
  graph: HubIssueGraph,
  opts?: { readonly includeRetest?: boolean; readonly maxSteps?: number },
): readonly HubAgentPlanStep[] {
  const maxSteps = opts?.maxSteps ?? 4;
  const ordered = sortRepairOrder(graph.nodes).slice(0, maxSteps);
  const steps: HubAgentPlanStep[] = ordered.map((node, i) =>
    repairStep(`repair_${node.id}_${i}`, `${node.title} 수정`, node.fixToolId, { ...node.fixArgs }),
  );

  if (opts?.includeRetest !== false) {
    steps.push(repairStep("retest", "테스트 재실행", "test.run"));
  }

  return steps;
}

/** Full verify-repair plan from current workspace state. */
export function planVerifyRepair(input: VerifyRepairInput): VerifyRepairPlan {
  const graph = buildIssueGraph(input);
  const repairSteps = planRepairStepsFromGraph(graph);
  const analyzed = analyzeErrors({
    issues: deriveProjectIssues(input.draft),
    testFailed: input.testFailed,
    testDetail: input.testDetail,
    toolError: input.toolError,
  });
  const rootCause = rootCauseAnalysis(analyzed);

  const errorCount = graph.nodes.filter((n) => n.severity === "error").length;
  const summaryKo =
    graph.nodes.length === 0
      ? "검증 통과 — 수정 불필요"
      : `${graph.nodes.length}개 이슈 · ${errorCount} error · RCA: ${rootCause.primaryCauseKo.slice(0, 40)} → ${repairSteps.length} repair steps`;

  return { graph, repairSteps, summaryKo, rootCause };
}

/** Apply manifest sync patch (used by manifest issue repair). */
export function applyManifestSyncPatch(draft: PlatformDraft): Partial<PlatformDraft> {
  return { manifestJson: syncPlatformManifestJson(draft) };
}
