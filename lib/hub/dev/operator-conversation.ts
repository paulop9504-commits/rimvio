/**
 * Platform Operator — bottom-anchored conversation entries.
 */

import type { OperatorDiff } from "@/lib/hub/dev/operator-diff";
import type { DevProjectChange, DevProjectIssue } from "@/lib/hub/dev/dev-project-state";

export type OperatorUserEntry = {
  readonly kind: "user";
  readonly id: string;
  readonly text: string;
  readonly at: number;
};

export type OperatorPlanningItem = {
  readonly label: string;
  readonly status: "done" | "running" | "pending";
};

export type OperatorAgentPayload =
  | { readonly type: "greeting"; readonly body: string }
  | { readonly type: "planning"; readonly title: string; readonly items: readonly OperatorPlanningItem[] }
  | {
      readonly type: "observe";
      readonly lines: readonly string[];
    }
  | {
      readonly type: "analysis";
      readonly headline: string;
      readonly bullets: readonly string[];
      readonly issues: readonly DevProjectIssue[];
      readonly changes: readonly DevProjectChange[];
      readonly changesCount: number;
    }
  | { readonly type: "text"; readonly body: string }
  | { readonly type: "diff"; readonly diff: OperatorDiff }
  | { readonly type: "testResult"; readonly passed: number; readonly total: number; readonly running?: boolean }
  | {
      readonly type: "verify";
      readonly ok: boolean;
      readonly detail: string;
    }
  | {
      readonly type: "askUser";
      readonly message: string;
      readonly actionId: string;
      readonly actionLabel: string;
      readonly publishGate?: import("@/lib/hub/dev/hub-publish-flow").PublishGateResult;
    }
  | { readonly type: "complete"; readonly summary: string };

export type OperatorAgentEntry = {
  readonly kind: "agent";
  readonly id: string;
  readonly at: number;
  readonly payload: OperatorAgentPayload;
};

export type OperatorConversationEntry = OperatorUserEntry | OperatorAgentEntry;

export function isPlanningEntry(entry: OperatorConversationEntry): boolean {
  return entry.kind === "agent" && entry.payload.type === "planning";
}

export function isWorkingEntry(entry: OperatorConversationEntry): boolean {
  return isPlanningEntry(entry);
}
