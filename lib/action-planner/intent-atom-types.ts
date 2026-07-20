/**
 * Multi-intent IR — keep + reject atoms before ActionPlan compose.
 */

import type { IntentFamily } from "@/lib/rule-engine/constitution";

export type IntentAtomPolarity = "do" | "reject";

/** Select is not a Rule IntentFamily — ordinal / deictic only. */
export type IntentAtomFamily = IntentFamily | "Select";

export type IntentAtomSelection = {
  readonly ordinal?: number | null;
  readonly deictic?: boolean;
};

export type IntentAtom = {
  readonly family: IntentAtomFamily;
  readonly polarity: IntentAtomPolarity;
  readonly cueSpan: string;
  readonly selection?: IntentAtomSelection;
  readonly order: number;
};

export type ParsedNlIntentChain = {
  readonly atoms: readonly IntentAtom[];
  /** True when reject present or 2+ do atoms — Action Planner path. */
  readonly isMulti: boolean;
};
