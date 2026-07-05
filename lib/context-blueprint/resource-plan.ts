/**
 * L2 sub-contract — WHAT is needed (ResourcePlan)
 * Required resources, truth, gaps — not search results.
 * @see docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md § Blueprint sub-contracts
 */

import type { ContextResourceKind } from "@/lib/context-blueprint/blueprint-constants";
import type {
  ContextBlueprintKnownTruth,
  ContextBlueprintNextQuestion,
} from "@/lib/context-blueprint/wire-fields";

export type ResourcePlan = {
  readonly requiredResources: readonly ContextResourceKind[];
  readonly knownTruth: readonly ContextBlueprintKnownTruth[];
  readonly emptySlots: readonly string[];
  readonly nextQuestion: ContextBlueprintNextQuestion | null;
};

export type ComposeResourcePlanInput = {
  requiredResources?: readonly ContextResourceKind[];
  knownTruth?: readonly ContextBlueprintKnownTruth[];
  emptySlots?: readonly string[];
  nextQuestion?: ContextBlueprintNextQuestion | null;
};

export function composeResourcePlan(
  input: ComposeResourcePlanInput,
): ResourcePlan {
  return {
    requiredResources: [...(input.requiredResources ?? [])],
    knownTruth: [...(input.knownTruth ?? [])],
    emptySlots: [...(input.emptySlots ?? [])],
    nextQuestion: input.nextQuestion ?? null,
  };
}
