import type { EntityKind } from "@/lib/entity-resolver";
import type { GlobeContextTrigger } from "@/lib/globe/context-triggers/globe-context-trigger-types";
import type { GlobeResumeSession } from "@/lib/globe/globe-resume-session";

/** Floor lens — Netflix filter chip analogue (not catalog browse). */
export type InstantCarryLens = "traces" | "context" | "todo" | "near";

export type InstantCarryHero = {
  kind: "resume" | "trigger";
  title: string;
  subtitle: string | null;
  /** 0..1 Continuity readiness — not media watch %. */
  progress: number;
  tags: readonly string[];
  resume: GlobeResumeSession | null;
  trigger: GlobeContextTrigger | null;
};

export type InstantCarryPoster = {
  id: string;
  trigger: GlobeContextTrigger;
  hook: string;
  meta: string | null;
};

export type InstantCarryMeaningLane = {
  id: string;
  title: string;
  posters: readonly InstantCarryPoster[];
};

/** Entity Resolver →「근처」lane (Station / Airport / Landmark…). */
export type InstantCarryNearLane = {
  id: string;
  title: string;
  entityLabel: string;
  entityKind: EntityKind;
  /** Compose seed — e.g. `도쿄역 근처` (not a discovery feed open). */
  seedQuery: string;
  posters: readonly InstantCarryPoster[];
};

export type InstantCarryFeedModel = {
  hero: InstantCarryHero | null;
  thenThere: readonly InstantCarryPoster[];
  meaningLanes: readonly InstantCarryMeaningLane[];
  nearLanes: readonly InstantCarryNearLane[];
  dense: readonly InstantCarryPoster[];
};
