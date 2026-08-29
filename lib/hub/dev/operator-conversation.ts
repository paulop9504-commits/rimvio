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

export type OperatorAgentPayload =
  | { readonly type: "working"; readonly steps: readonly string[] }
  | {
      readonly type: "analysis";
      readonly headline: string;
      readonly bullets: readonly string[];
      readonly issues: readonly DevProjectIssue[];
      readonly changes: readonly DevProjectChange[];
      readonly changesCount: number;
    }
  | { readonly type: "text"; readonly body: string }
  | { readonly type: "diff"; readonly diff: OperatorDiff };

export type OperatorAgentEntry = {
  readonly kind: "agent";
  readonly id: string;
  readonly at: number;
  readonly payload: OperatorAgentPayload;
};

export type OperatorConversationEntry = OperatorUserEntry | OperatorAgentEntry;

export function isWorkingEntry(entry: OperatorConversationEntry): boolean {
  return entry.kind === "agent" && entry.payload.type === "working";
}
