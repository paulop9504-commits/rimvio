import type { SlotDefinition } from "@/lib/intake/types";

/** Unified gap analysis — required + optional validate per slot definition. */
export function assessGapsFromSlots<TState, TGap extends string>(
  state: TState,
  slotDefs: readonly SlotDefinition<TState, TGap>[],
): readonly TGap[] {
  const gaps: TGap[] = [];
  for (const slot of slotDefs) {
    const filled = slot.isFilled(state);
    if (slot.required && !filled) {
      gaps.push(slot.id);
      continue;
    }
    if (filled && slot.validate && !slot.validate(state)) {
      gaps.push(slot.id);
    }
  }
  return gaps;
}

export function isIntakeComplete<TState, TGap extends string>(
  state: TState,
  slotDefs: readonly SlotDefinition<TState, TGap>[],
): boolean {
  return assessGapsFromSlots(state, slotDefs).length === 0;
}
