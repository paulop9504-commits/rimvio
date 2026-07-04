import type { EventCandidate } from "@/lib/events/event-candidate";
import type { BrainPolicy } from "@/lib/situation-projection/brain-core/types";
import {
  buildTravelBrainProjection,
  type TravelBrainProjection,
  type TravelBrainQuestion,
  type TravelBrainState,
} from "@/lib/situation-projection/travel-brain-personalization";
import { buildTravelProjectionGhosts } from "@/lib/situation-projection/travel-brain-projection";
import type { GhostProjectionNode } from "@/lib/situation-projection/types";

export const travelBrainPolicy: BrainPolicy<
  EventCandidate,
  TravelBrainState,
  TravelBrainQuestion,
  GhostProjectionNode,
  TravelBrainProjection
> = {
  sectorId: "travel",
  buildProjection: (event): TravelBrainProjection => buildTravelBrainProjection(event),
  buildResources: (event, projection) => buildTravelProjectionGhosts(event, projection),
};
