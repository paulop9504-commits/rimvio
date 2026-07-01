import type { SellItemDraft } from "@/lib/portal/compose-draft/types";

export type FlowStep = {
  key: string;
  labelKo: string;
  slotKey: string;
  isComplete: (draft: Partial<SellItemDraft>) => boolean;
};

export function findNextFlowStep(
  draft: Partial<SellItemDraft>,
  flow: readonly FlowStep[],
): FlowStep | null {
  return flow.find((step) => !step.isComplete(draft)) ?? null;
}

export function isFlowComplete(
  draft: Partial<SellItemDraft>,
  flow: readonly FlowStep[],
): boolean {
  return flow.every((step) => step.isComplete(draft));
}
