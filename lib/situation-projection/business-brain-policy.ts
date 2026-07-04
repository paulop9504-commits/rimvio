import type { EventCandidate } from "@/lib/events/event-candidate";
import type { BrainPolicy, BrainProjection, BrainQuestionBase } from "@/lib/situation-projection/brain-core/types";
import type { GhostProjectionNode } from "@/lib/situation-projection/types";

export type BusinessBrainState = {
  focus: "business";
  anchorTitle: string;
};

export type BusinessBrainQuestion = BrainQuestionBase<"schedule_density" | "meeting_anchor">;

export const businessBrainPolicy: BrainPolicy<
  EventCandidate,
  BusinessBrainState,
  BusinessBrainQuestion,
  GhostProjectionNode
> = {
  sectorId: "business",
  buildProjection: (event): BrainProjection<BusinessBrainState, BusinessBrainQuestion> => ({
    state: {
      focus: "business",
      anchorTitle: event.title,
    },
    questions: [],
  }),
  buildResources: () => [],
};
