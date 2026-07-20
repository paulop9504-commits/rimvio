export type {
  ContextFieldId,
  ContextCompanion,
  ContextFieldHints,
  ContextField,
  ContextFieldPack,
  ContextPriceField,
  ContextBudgetField,
  ContextLocationField,
  ContextDistanceField,
  ContextPopularityField,
  ContextMoodField,
  ContextCategoryField,
  ContextCompanionField,
  ContextTransportField,
  ContextWeatherField,
  ContextCrowdField,
  ContextTimeField,
} from "@/lib/context-field/types";

export {
  parseContextFields,
  parseTransportField,
  parseBudgetField,
  parseVibeField,
  parseCompanionField,
  parseMaxWalkMinutesField,
  contextFieldsRequireSpatialPatch,
} from "@/lib/context-field/parse-context-fields";

export {
  applyFieldsToDiscoverySpec,
  mergeDiscoveryFieldPatch,
  type DiscoveryFieldPatch,
} from "@/lib/context-field/apply-fields-to-discovery-spec";

export {
  applyFieldsToGraphFilter,
  mergeGraphFilterPredicates,
} from "@/lib/context-field/apply-fields-to-graph-filter";

export { mapContextCompanionToTravelMode } from "@/lib/context-field/map-companion-to-travel";

export {
  projectFieldControlPlane,
  composeSearchQueryWithFieldControl,
  applyFieldControlToPlaceHits,
  bookingControlToToolMeta,
  type ContextFieldControlPlane,
  type ContextFieldSearchControl,
  type ContextFieldBookingControl,
} from "@/lib/context-field/project-field-control-plane";

export { compileContextFieldControl } from "@/lib/context-field/compile-context-field-control";

export {
  writeContextFieldControl,
  readContextFieldControl,
  clearContextFieldControl,
  resetContextFieldControlStoreForTests,
} from "@/lib/context-field/context-field-session-store";
