/**
 * Loop Definition — Visual / AI / Code compile to this SSOT.
 * Runtime executes via existing Agent Turn + Tool Gateway.
 */

export const LOOP_CORE_KINDS = [
  "TRIGGER",
  "UNDERSTAND",
  "INSPECT",
  "DECIDE",
  "ACT",
  "OBSERVE",
  "VERIFY",
  "CONDITION",
  "REPLAN",
  "RETRY",
  "WAIT",
  "ASK_USER",
  "APPROVAL",
  "COMPLETE",
  "FAIL",
] as const;

export const LOOP_CAPABILITY_KINDS = [
  "CAPABILITY",
  "TOOL",
  "API",
  "DATABASE",
  "BROWSER",
  "WORKFLOW",
  "CUSTOM",
] as const;

export const LOOP_DATA_KINDS = ["INPUT", "OUTPUT", "VARIABLE", "CONTEXT", "STATE"] as const;

export const LOOP_NODE_KINDS = [
  ...LOOP_CORE_KINDS,
  ...LOOP_CAPABILITY_KINDS,
  ...LOOP_DATA_KINDS,
] as const;

export type LoopNodeKind = (typeof LOOP_NODE_KINDS)[number];

export type LoopEdgeKind = "next" | "yes" | "no" | "pass" | "fail";

export type LoopNode = {
  readonly id: string;
  readonly kind: LoopNodeKind;
  readonly label: string;
  readonly config: LoopNodeConfig;
};

export type LoopNodeConfig = {
  readonly target?: string;
  readonly capabilityId?: string;
  readonly toolId?: string;
  readonly checks?: readonly string[];
  readonly onSuccess?: "continue" | "complete" | "verify";
  readonly onFailure?: "replan" | "retry" | "ask_user" | "fail";
  readonly maxAttempts?: number;
  readonly predicate?: string;
  /** Rimvio preset template id */
  readonly templateId?: string;
  /** User-authored block code (Visual ↔ Pro 1:1) */
  readonly customCode?: string;
  readonly description?: string;
  readonly inputMap?: Readonly<Record<string, string>>;
  readonly outputVars?: readonly string[];
};

export type LoopEdge = {
  readonly from: string;
  readonly to: string;
  readonly kind: LoopEdgeKind;
};

export type LoopDefinition = {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly source: "simple" | "visual" | "code" | "ai";
  readonly nodes: readonly LoopNode[];
  readonly edges: readonly LoopEdge[];
  readonly entryId: string;
};

export type LoopLintIssue = {
  readonly severity: "error" | "warning";
  readonly code: string;
  readonly messageKo: string;
  readonly nodeId?: string;
};

export type LoopLintCheck = {
  readonly ok: boolean;
  readonly label: string;
};

export type LoopLintResult = {
  readonly ok: boolean;
  readonly publishBlocked: boolean;
  readonly issues: readonly LoopLintIssue[];
  readonly checks: readonly LoopLintCheck[];
};

export type LoopTraceStep = {
  readonly atIso: string;
  readonly nodeId: string;
  readonly label: string;
  readonly status: "pass" | "fail" | "skip";
  readonly detail: string;
};

export type LoopTestResult = {
  readonly runId: string;
  readonly passed: boolean;
  readonly steps: readonly { readonly nodeId: string; readonly label: string; readonly ok: boolean }[];
  readonly traces: readonly LoopTraceStep[];
  readonly reasonKo: string | null;
};

export type AgentCapabilityPackage = {
  readonly name: string;
  readonly version: string;
  readonly capabilities: readonly string[];
  readonly loop: LoopDefinition;
  readonly policies: readonly string[];
  readonly verification: readonly string[];
  readonly dependencies: readonly string[];
  readonly tested: boolean;
  readonly verified: boolean;
};

export type LoopBuilderMode = "simple" | "visual" | "pro";
