export type {
  FactAnswerWire,
  FactEvidenceItem,
  FactMarkerKind,
  FactProjectionState,
  FactQueryClassification,
  FactQueryKind,
} from "@/lib/fact-query/types";
export { FACT_PROJECTION_EVENT } from "@/lib/fact-query/types";
export {
  classifyFactQuery,
  isFactQueryUtterance,
} from "@/lib/fact-query/classify-fact-query";
export {
  clearFactProjectionForTests,
  publishFactProjection,
  readFactProjection,
  subscribeFactProjection,
} from "@/lib/fact-query/fact-projection-store";
export {
  resolveFactQuery,
  resolveFactQueryAsync,
} from "@/lib/fact-query/resolve-fact-query";
export {
  projectFactAnswerToGlobe,
  tryBuildFactQueryTurn,
  tryBuildFactQueryTurnAsync,
} from "@/lib/fact-query/dispatch-fact-query-turn";
export { runTransitMaxInterchangeTool } from "@/lib/fact-query/tools/transit-max-interchange";
export { runPoiHotspotsTool } from "@/lib/fact-query/tools/poi-hotspots";
export {
  runDistanceLookupTool,
  runWeatherLookupTool,
} from "@/lib/fact-query/tools/lookup-tools";
export {
  looksLikeScheduleFeasibilityAsk,
  parseScheduleFeasibilityQuery,
  runScheduleFeasibilityTool,
} from "@/lib/fact-query/tools/schedule-feasibility";
export {
  looksLikeTransitLastTrainAsk,
  looksLikeTransitRouteAsk,
  runTransitLastTrainTool,
  runTransitRouteLookupTool,
} from "@/lib/fact-query/tools/gtfs-transit-tools";
export {
  lookupGtfsLastTrain,
  planGtfsRoute,
} from "@/lib/fact-query/data/gtfs-transit-ssot";
export {
  looksLikeMidpointMeetingAsk,
  parseMidpointMeetingQuery,
  runMidpointMeetingTool,
} from "@/lib/fact-query/tools/midpoint-meeting";
export {
  looksLikeTransitRealtimeAsk,
  runTransitRealtimeTool,
} from "@/lib/fact-query/tools/gtfs-rt-tools";
export {
  looksLikeTransitCrowdingAsk,
  runTransitCrowdingTool,
} from "@/lib/fact-query/tools/transit-crowding-tools";
export { lookupGtfsRtUpdates } from "@/lib/fact-query/gtfs/gtfs-rt-registry";
export { resolveFactPlace } from "@/lib/fact-query/data/resolve-fact-place";
