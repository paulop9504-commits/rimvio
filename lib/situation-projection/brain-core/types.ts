import type { PersonaLearnChoice } from "@/lib/persona/types";

export type BrainQuestionBase<SlotId extends string, AxisId extends string = string> = {
  id: string;
  slotId: SlotId;
  axisId: AxisId;
  titleKo: string;
  choices: readonly PersonaLearnChoice[];
  impact: number;
};

export type BrainProjection<State, Question> = {
  state: State;
  questions: readonly Question[];
};

export type BrainPolicy<
  EventInput,
  ProjectionState,
  Question,
  Resource,
  Projection extends BrainProjection<ProjectionState, Question> = BrainProjection<
    ProjectionState,
    Question
  >,
> = {
  sectorId: string;
  buildProjection: (event: EventInput) => Projection;
  buildResources: (
    event: EventInput,
    projection: Projection,
  ) => Resource[];
};
