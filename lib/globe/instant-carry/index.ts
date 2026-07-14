export type {
  InstantCarryFeedModel,
  InstantCarryHero,
  InstantCarryLens,
  InstantCarryMeaningLane,
  InstantCarryNearLane,
  InstantCarryPoster,
} from "@/lib/globe/instant-carry/types";
export { buildInstantCarryFeed } from "@/lib/globe/instant-carry/build-instant-carry-feed";
export {
  buildInstantCarryNearLanes,
  resolveInstantCarryNearEntities,
  triggerMatchesNearEntity,
} from "@/lib/globe/instant-carry/build-instant-carry-near-lanes";
export {
  clearInstantCarryEntityAnchors,
  isNearCapableEntity,
  readInstantCarryEntityAnchors,
  recordInstantCarryAnchorsFromUtterance,
} from "@/lib/globe/instant-carry/instant-carry-entity-anchor-store";
