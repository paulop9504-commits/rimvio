import type { PersonalContextAskRecallContext } from "@/lib/personal-context-ask/personal-context-ask-types";

export type GlobeAskContinuityActionId =
  | "context_talk"
  | "peer_chat"
  | "feed_moment"
  | "portal_align";

export type GlobeAskContinuityAction = {
  id: GlobeAskContinuityActionId;
  href: string;
};

/** Cross-surface next steps after personal ask recall. */
export function buildPersonalAskContinuityActions(input: {
  recall: PersonalContextAskRecallContext | null;
  featuredEventId: string | null;
}): GlobeAskContinuityAction[] {
  const recall = input.recall;
  const actions: GlobeAskContinuityAction[] = [];

  if (recall?.contextTalkThreadId) {
    actions.push({
      id: "context_talk",
      href: `/peers/${recall.contextTalkThreadId}`,
    });
  }

  if (
    recall?.peerThreadId &&
    recall.peerThreadId !== recall.contextTalkThreadId
  ) {
    actions.push({
      id: "peer_chat",
      href: `/peers/${recall.peerThreadId}`,
    });
  }

  if (input.featuredEventId?.trim()) {
    actions.push({
      id: "feed_moment",
      href: `/feed?event=${encodeURIComponent(input.featuredEventId.trim())}`,
    });
  }

  return actions;
}
