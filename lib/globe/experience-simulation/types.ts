/** Experience Simulation Runtime — Flow playback over bound context (L4). */

export type ExperienceScenarioBranchId = "A" | "B" | "C";

export type ExperienceScenarioNodeKind = "anchor" | "place";

export type ExperienceScenarioResourceKind = "anchor" | "lodging" | "eatery";

export type ExperienceScenarioNodeStatus = "pending" | "active" | "done";

export type ExperienceScenarioOrderingMode = "quick" | "balanced" | "stay_last";

export type ExperienceScenarioNode = {
  readonly id: string;
  readonly placeId: string;
  readonly kind: ExperienceScenarioNodeKind;
  readonly resourceKind: ExperienceScenarioResourceKind;
  readonly title: string;
  readonly lat: number;
  readonly lng: number;
  readonly rank: number;
  readonly travelMinFromPrev: number;
  readonly dwellMin: number;
  readonly scheduledAtIso: string;
  readonly status: ExperienceScenarioNodeStatus;
};

export type ExperienceScenarioBranch = {
  readonly id: ExperienceScenarioBranchId;
  readonly labelKo: string;
  readonly mode: ExperienceScenarioOrderingMode;
  readonly nodes: readonly ExperienceScenarioNode[];
};

export type ExperienceScenario = {
  readonly contextEventId: string;
  readonly batchId: string;
  readonly anchorTitle: string;
  readonly anchorLat: number;
  readonly anchorLng: number;
  readonly branches: readonly ExperienceScenarioBranch[];
  readonly activeBranchId: ExperienceScenarioBranchId;
  readonly startAtIso: string;
};

export type SimulationPlaybackState = {
  readonly playing: boolean;
  readonly cursorIndex: number;
  readonly activeLegIndex: number;
};

export type ItineraryDiff = {
  readonly kept: readonly string[];
  readonly inserted: readonly string[];
  readonly removed: readonly string[];
  readonly reordered: boolean;
  readonly summaryKo: string;
};

export type ExperienceSimulationState = {
  readonly scenario: ExperienceScenario | null;
  readonly playback: SimulationPlaybackState;
  readonly itineraryDiff: ItineraryDiff | null;
};
