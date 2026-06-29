/** Cursor-grade agent run — one prompt → context event → hub → summary. */

export type ExperienceRunProfile =
  | "business_trip"
  | "lodging_search"
  | "eatery_search"
  | "recall_only";

export type ExperienceRunStepId =
  | "situation_confirm"
  | "context_event"
  | "hub_lodging"
  | "hub_eatery"
  | "map_reveal"
  | "summary";

export type ExperienceRunStepStatus = "pending" | "running" | "done" | "skipped" | "failed";

export type ExperienceRunStep = {
  id: ExperienceRunStepId;
  status: ExperienceRunStepStatus;
  labelKo: string;
};

export type ExperienceRunSummary = {
  runId: string;
  profile: ExperienceRunProfile;
  titleKo: string;
  bodyKo: string;
  meaningLineKo?: string | null;
  eventId: string;
  topLodgingName?: string | null;
  topLodgingReasonKo?: string | null;
  lodgingCount?: number;
  topEateryName?: string | null;
  topEateryReasonKo?: string | null;
  eateryCount?: number;
  steps: readonly ExperienceRunStep[];
};

export type ExperienceRunClarify = {
  kind: "clarify";
  questionKo: string;
  profile: ExperienceRunProfile;
  seedMessage: string;
};

export type ExperienceRunResult =
  | ExperienceRunClarify
  | {
      kind: "summary";
      summary: ExperienceRunSummary;
      closeSheet?: boolean;
    }
  | { kind: "noop" };

export type PendingSituationLock = {
  profile: ExperienceRunProfile;
  seedMessage: string;
  destination: string | null;
  askedAt: string;
};
