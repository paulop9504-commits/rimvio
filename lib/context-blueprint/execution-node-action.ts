/**
 * Execution Node Action — WHAT to do at this execution step.
 * Attached to ExecutionGraphNode (not a separate layer).
 * @see docs/RIMVIO_EXECUTION_GRAPH.md
 */

import type { DomainExecutorId } from "@/lib/context-blueprint/blueprint-constants";

export const EXECUTION_ACTION_KINDS = [
  "check",
  "pack",
  "exchange",
  "check_in",
  "baggage",
  "board",
  "hotel_check_in",
  "questionnaire",
  "chat",
  "pay",
  "navigate",
  "book",
  "list",
  "negotiate",
  "meet",
  "treat",
  "pickup",
  "observe",
  "custom",
] as const;

export type ExecutionActionKind = (typeof EXECUTION_ACTION_KINDS)[number];

export type ExecutionNodeAction = {
  readonly id: string;
  readonly kind: ExecutionActionKind;
  readonly label: string;
  readonly executorHint: DomainExecutorId | null;
};

export function composeExecutionNodeAction(input: {
  id: string;
  kind: ExecutionActionKind;
  label: string;
  executorHint?: DomainExecutorId | null;
}): ExecutionNodeAction {
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    executorHint: input.executorHint ?? null,
  };
}
