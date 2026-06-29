import type { PortalCategoryId, PortalIntentId } from "@/lib/portal/portal-types";
import { copy } from "@/lib/copy/human-ko";

export type PortalSocialSlotId = "topic" | "place" | "time";

export type PortalSocialSlotDef = {
  slotId: PortalSocialSlotId;
  questionKo: string;
};

const TOGETHER_SLOTS: readonly PortalSocialSlotDef[] = [
  { slotId: "topic", questionKo: copy.portal.composeAskTogetherTopic },
  { slotId: "place", questionKo: copy.portal.composeAskPlace },
  { slotId: "time", questionKo: copy.portal.composeAskTime },
];

const JOIN_SLOTS: readonly PortalSocialSlotDef[] = [
  { slotId: "topic", questionKo: copy.portal.composeAskJoinTopic },
  { slotId: "place", questionKo: copy.portal.composeAskPlace },
  { slotId: "time", questionKo: copy.portal.composeAskTime },
];

export function listPortalSocialSlots(
  intentId: PortalIntentId,
): readonly PortalSocialSlotDef[] {
  if (intentId === "join") {
    return JOIN_SLOTS;
  }
  if (intentId === "together") {
    return TOGETHER_SLOTS;
  }
  return [];
}

export function nextPortalSocialQuestion(input: {
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  filled: Partial<Record<PortalSocialSlotId, string>>;
}): { slotId: PortalSocialSlotId; questionKo: string } | null {
  const slots = listPortalSocialSlots(input.intentId);
  for (const slot of slots) {
    const value = input.filled[slot.slotId]?.trim();
    if (!value) {
      return slot;
    }
  }
  return null;
}

export function buildPortalSocialTitle(input: {
  intentId: PortalIntentId;
  categoryId: PortalCategoryId | null;
  filled: Partial<Record<PortalSocialSlotId, string>>;
}): string {
  const topic = input.filled.topic?.trim();
  if (topic) {
    return topic.slice(0, 80);
  }
  if (input.intentId === "join") {
    return copy.portal.composeSocialFallbackJoin;
  }
  return copy.portal.composeSocialFallbackTogether;
}
