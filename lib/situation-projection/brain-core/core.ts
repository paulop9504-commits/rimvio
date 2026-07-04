import type { PersonaLearnChoice } from "@/lib/persona/types";

export function reduceBrainQuestions<Question extends { impact: number; slotId: string }>(
  candidates: readonly Question[],
  maxQuestions: number,
): Question[] {
  return [...candidates]
    .sort((left, right) => right.impact - left.impact || left.slotId.localeCompare(right.slotId))
    .slice(0, maxQuestions);
}

export function collectLearnedSlotOverrides<
  SlotId extends string,
  SlotValueMap extends Record<SlotId, unknown>,
>(
  slots: Record<
    SlotId,
    {
      id: SlotId;
      value: SlotValueMap[SlotId];
      source: string;
    }
  >,
): Partial<Record<SlotId, SlotValueMap[SlotId]>> {
  const overrides: Partial<Record<SlotId, SlotValueMap[SlotId]>> = {};
  for (const slot of Object.values(slots) as Array<{
    id: SlotId;
    value: SlotValueMap[SlotId];
    source: string;
  }>) {
    if (slot.source === "learned") {
      overrides[slot.id] = slot.value;
    }
  }
  return overrides;
}

export function applyBrainAnswerOverride<
  SlotId extends string,
  SlotValueMap extends Record<SlotId, unknown>,
>(
  overrides: Partial<Record<SlotId, SlotValueMap[SlotId]>>,
  slotId: SlotId,
  choice: PersonaLearnChoice,
): Partial<Record<SlotId, SlotValueMap[SlotId]>> {
  return {
    ...overrides,
    [slotId]: choice.value as SlotValueMap[SlotId],
  };
}
