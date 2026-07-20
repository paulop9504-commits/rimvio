/**
 * Soft confirm — condition edits (Filter / Pin / Delete) before session-graph apply.
 * Field Commit stays Reserve / Purchase / reservedOpIds only.
 */

import type { GraphCommand } from "@/lib/graph-command/types";

export type SoftConfirmKind = "filter" | "pin" | "delete" | "share";

export type SoftConfirmChip = {
  readonly id: string;
  readonly labelKo: string;
  readonly gapId: string;
  readonly value: string;
};

export type SoftConfirmPending = {
  readonly kind: SoftConfirmKind;
  readonly summaryKo: string;
  readonly confirmHintKo: string;
  readonly commands: readonly GraphCommand[];
  readonly utterance: string;
  readonly atIso: string;
};
