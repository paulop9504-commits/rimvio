/**
 * Capabilities #69 Error Analysis · #70 Root Cause Analysis.
 */

import type { DevProjectIssue } from "@/lib/hub/dev/dev-project-state";
import type { HubIssueNode } from "@/lib/hub/dev/hub-verify-repair";

export type ErrorCategory =
  | "schema"
  | "approval"
  | "auth"
  | "manifest"
  | "test"
  | "tool"
  | "regression"
  | "unknown";

export type AnalyzedError = {
  readonly id: string;
  readonly category: ErrorCategory;
  readonly severity: "error" | "warning";
  readonly title: string;
  readonly detail: string;
  readonly capabilityId?: string;
  readonly suggestedFixKo: string;
};

export type RootCauseReport = {
  readonly primaryCauseId: string;
  readonly primaryCauseKo: string;
  readonly contributingFactors: readonly string[];
  readonly repairOrder: readonly string[];
};

function categorizeIssue(issue: DevProjectIssue): ErrorCategory {
  if (issue.detail.includes("schema")) return "schema";
  if (issue.detail.includes("approval")) return "approval";
  if (issue.detail.includes("API key") || issue.title === "Authentication") return "auth";
  if (issue.detail.includes("manifest")) return "manifest";
  return "unknown";
}

/** Capability #69 — Analyze project issues + runtime signals into structured errors. */
export function analyzeErrors(input: {
  readonly issues: readonly DevProjectIssue[];
  readonly testFailed?: boolean;
  readonly testDetail?: string;
  readonly toolError?: string;
}): readonly AnalyzedError[] {
  const out: AnalyzedError[] = input.issues.map((issue) => ({
    id: issue.id,
    category: categorizeIssue(issue),
    severity: issue.severity,
    title: issue.title,
    detail: issue.detail,
    capabilityId: issue.capabilityId,
    suggestedFixKo: issue.fixPrompt,
  }));

  if (input.testFailed) {
    out.push({
      id: "err-test",
      category: "test",
      severity: "error",
      title: "Test failure",
      detail: input.testDetail ?? "Sandbox test failed",
      capabilityId: input.issues.find((i) => i.capabilityId?.includes("payment"))?.capabilityId ?? "payment.commit",
      suggestedFixKo: "실패한 capability schema/approval을 수정하고 테스트를 재실행합니다.",
    });
  }

  if (input.toolError) {
    out.push({
      id: "err-tool",
      category: "tool",
      severity: "error",
      title: "Tool execution",
      detail: input.toolError,
      suggestedFixKo: "도구 실행 오류 원인을 schema 또는 manifest에서 수정합니다.",
    });
  }

  return out;
}

const CAUSE_PRIORITY: Record<ErrorCategory, number> = {
  manifest: 0,
  schema: 1,
  approval: 2,
  auth: 3,
  test: 4,
  tool: 5,
  regression: 6,
  unknown: 7,
};

/** Capability #70 — Root cause analysis from analyzed errors. */
export function rootCauseAnalysis(errors: readonly AnalyzedError[]): RootCauseReport {
  if (errors.length === 0) {
    return {
      primaryCauseId: "none",
      primaryCauseKo: "이슈 없음",
      contributingFactors: [],
      repairOrder: [],
    };
  }

  const sorted = [...errors].sort((a, b) => CAUSE_PRIORITY[a.category] - CAUSE_PRIORITY[b.category]);
  const primary = sorted[0]!;
  const contributingFactors = sorted.slice(1).map((e) => `${e.title}: ${e.detail}`);

  return {
    primaryCauseId: primary.id,
    primaryCauseKo: `${primary.title} — ${primary.detail}`,
    contributingFactors,
    repairOrder: sorted.map((e) => e.id),
  };
}

/** Map analyzed errors → Hub issue nodes for repair planner. */
export function errorsToIssueNodes(errors: readonly AnalyzedError[]): HubIssueNode[] {
  return errors.map((e) => ({
    id: e.id,
    kind:
      e.category === "schema"
        ? "schema"
        : e.category === "approval"
          ? "approval"
          : e.category === "auth"
            ? "auth"
            : e.category === "manifest"
              ? "manifest"
              : e.category === "test"
                ? "test"
                : e.category === "tool"
                  ? "tool"
                  : "preview",
    severity: e.severity,
    title: e.title,
    detail: e.detail,
    capabilityId: e.capabilityId,
    fixToolId:
      e.category === "schema"
        ? "schema.update"
        : e.category === "approval"
          ? "capability.update"
          : e.category === "auth"
            ? "connection.verify"
            : e.category === "manifest"
              ? "file.patch"
              : e.category === "test"
                ? "schema.update"
                : "test.run",
    fixArgs:
      e.category === "schema"
        ? { capability: e.capabilityId ?? e.title, fixApprovalToken: true }
        : e.category === "approval"
          ? { capability: e.capabilityId, approvalRequired: true }
          : e.category === "manifest"
            ? { syncManifest: true }
            : e.category === "test"
              ? { capability: e.capabilityId ?? "payment.commit", fixApprovalToken: true }
              : {},
  }));
}
