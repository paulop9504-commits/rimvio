import type { EventCandidate } from "@/lib/events/event-candidate";
import type { BrainPolicy, BrainProjection, BrainQuestionBase } from "@/lib/situation-projection/brain-core/types";
import type { GhostProjectionNode } from "@/lib/situation-projection/types";

export type CaregivingBrainState = {
  focus: "caregiving";
  anchorTitle: string;
};

export type CaregivingBrainQuestion = BrainQuestionBase<"insurance" | "visit_rhythm">;

export const caregivingBrainPolicy: BrainPolicy<
  EventCandidate,
  CaregivingBrainState,
  CaregivingBrainQuestion,
  GhostProjectionNode
> = {
  sectorId: "caregiving",
  buildProjection: (event): BrainProjection<CaregivingBrainState, CaregivingBrainQuestion> => ({
    state: {
      focus: "caregiving",
      anchorTitle: event.title,
    },
    questions: [],
  }),
  buildResources: () => [],
};
