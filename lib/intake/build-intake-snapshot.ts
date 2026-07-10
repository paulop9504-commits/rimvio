import { assessGapsFromSlots, isIntakeComplete } from "@/lib/intake/assess-gaps-from-slots";
import type {
  DomainIntakeSnapshot,
  SlotDefinition,
} from "@/lib/intake/types";

export function buildIntakeSnapshot<TState, TGap extends string>(input: {
  domainId: string;
  state: TState;
  slotDefs: readonly SlotDefinition<TState, TGap>[];
}): DomainIntakeSnapshot<TState, TGap> {
  const gaps = assessGapsFromSlots(input.state, input.slotDefs);
  return {
    domainId: input.domainId,
    state: input.state,
    gaps,
    complete: isIntakeComplete(input.state, input.slotDefs),
  };
}
