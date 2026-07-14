export type {
  RimvioEngineDefinition,
  RimvioEngineGoal,
  RimvioEngineId,
  RimvioEnginePlan,
  RimvioEngineRunState,
  RimvioEngineTurnInput,
} from "@/lib/engine/engine-types";
export { RIMVIO_ENGINE_IDS, RIMVIO_ENGINE_RUN_STATES } from "@/lib/engine/engine-types";

export type {
  EngineEventKindBinding,
  EngineMemorySlot,
  EnginePolicy,
  EngineToolBinding,
  EngineWorkflowStep,
  EngineWorkflowStepId,
  RimvioEnginePackage,
  RimvioEnginePackageManifest,
  RimvioEngineRuntime,
} from "@/lib/engine/engine-package";
export {
  DEFAULT_ENGINE_POLICY,
  ENGINE_WORKFLOW_STEP_IDS,
  STANDARD_ENGINE_WORKFLOW,
  defineRimvioEnginePackage,
  standardEngineEventBindings,
} from "@/lib/engine/engine-package";

export {
  detectRimvioEnginesForMessage,
  getRimvioEngineById,
  getRimvioEnginePackageById,
  listRimvioEnginePackages,
  listRimvioEngines,
  planRimvioEngineTurn,
  readRimvioEngineRunState,
} from "@/lib/engine/engine-registry";

export { resolveEngineOperatorTurn } from "@/lib/engine/resolve-engine-operator-turn";

export {
  resolveDiscoveryEngineId,
  resolveEngineIdFromDiscoveryKind,
  resolveEngineIdFromDiscoveryMessage,
  resolveEngineIdFromDiscoverySpec,
  type DiscoveryRecommendationKind,
} from "@/lib/engine/resolve-discovery-engine-id";

export {
  EXECUTION_GRAPH_ENGINE_BINDINGS,
  primaryExecutionNodeForEngine,
  resolveEngineForExecutionNode,
  resolveEngineIdsForExecutionGraphNode,
  resolveExecutionNodesForEngine,
} from "@/lib/engine/execution-graph-engine-bindings";

export {
  CONTEXT_ENGINE_EVENTS_META_KEY,
  RIMVIO_ENGINE_EVENT_KINDS,
  appendEngineEventToMetadata,
  readEngineEventsFromMetadata,
  type RimvioEngineEventKind,
  type RimvioEngineEventV1,
} from "@/lib/engine/engine-event-metadata";

export {
  buildEngineEventTimelineRows,
  type EngineEventTimelineRow,
} from "@/lib/engine/format-engine-event-timeline";

export {
  CONTEXT_INSTALLED_ENGINES_META_KEY,
  INSTALLED_ENGINE_SOURCES,
  appendInstalledEngineRecord,
  hasExplicitInstalledEnginesWire,
  readInstalledEngineRecordsFromMetadata,
  readInstalledEnginesWireFromMetadata,
  writeInstalledEnginesWireToMetadata,
  type ContextInstalledEnginesWireV1,
  type InstalledEngineRecordV1,
  type InstalledEngineSource,
} from "@/lib/engine/context-installed-engines-metadata";

export {
  CONTEXT_CONTAINER_KIND_META_KEY,
  inferContextContainerKind,
} from "@/lib/engine/infer-context-container-kind";

export {
  DEFAULT_INSTALLED_ENGINE_IDS_BY_CONTAINER,
  buildBootstrapInstalledEngineRecord,
  buildBootstrapInstalledEngineRecords,
  defaultInstalledEngineIds,
} from "@/lib/engine/default-installed-engines";

export {
  isEngineInstalledOnContext,
  listContextInstalledEnginePackages,
  readContextInstalledEngineIds,
  readContextInstalledEngineRecords,
  resolvePersistedOrBootstrapEngineRecords,
} from "@/lib/engine/resolve-context-installed-engines";

export {
  bootstrapInstalledEnginesOnContextMetadata,
  installEngineManifestOnContextMetadata,
  type InstallContextEngineResult,
} from "@/lib/engine/install-context-engine";

export {
  bootstrapContextInstalledEnginesClient,
  installEngineManifestToContextClient,
} from "@/lib/engine/install-context-engine-client";

export {
  deriveEngineIdsFromExecutionGraph,
} from "@/lib/engine/derive-engine-ids-from-execution-graph";

export {
  syncInstalledEnginesFromBlueprintMetadata,
} from "@/lib/engine/sync-installed-engines-from-blueprint";

export {
  syncContextInstalledEnginesFromBlueprintClient,
} from "@/lib/engine/sync-installed-engines-from-blueprint-client";

export { recordEngineEventClient } from "@/lib/engine/record-engine-event-client";
export { recordEngineLifecycleClient, recordEngineScoutFailureClient } from "@/lib/engine/record-engine-lifecycle";

export {
  lodgingSearchEnginePackage,
  lodgingSearchEnginePackage as lodgingSearchEngine,
  LODGING_SEARCH_ENGINE_GOAL,
} from "@/lib/engine/packages/lodging-search-package";
export {
  tripExperienceSearchEnginePackage,
  tripExperienceSearchEnginePackage as tripExperienceSearchEngine,
  TRIP_EXPERIENCE_SEARCH_ENGINE_GOAL,
} from "@/lib/engine/packages/trip-experience-search-package";
export {
  flightBookingEnginePackage,
  flightBookingEnginePackage as flightBookingEngine,
  FLIGHT_BOOKING_ENGINE_GOAL,
} from "@/lib/engine/packages/flight-booking-package";
export {
  transitNavigateEnginePackage,
  transitNavigateEnginePackage as transitNavigateEngine,
  TRANSIT_NAVIGATE_ENGINE_GOAL,
} from "@/lib/engine/packages/transit-navigate-package";
export {
  financePrepEnginePackage,
  financePrepEnginePackage as financePrepEngine,
  FINANCE_PREP_ENGINE_GOAL,
} from "@/lib/engine/packages/finance-prep-package";
export {
  localAmenitySearchEnginePackage,
  localAmenitySearchEnginePackage as localAmenitySearchEngine,
  LOCAL_AMENITY_SEARCH_ENGINE_GOAL,
} from "@/lib/engine/packages/local-amenity-search-package";
export {
  eaterySearchEnginePackage,
  eaterySearchEnginePackage as eaterySearchEngine,
  EATERY_SEARCH_ENGINE_GOAL,
} from "@/lib/engine/packages/eatery-search-package";
export {
  activitySearchEnginePackage,
  activitySearchEnginePackage as activitySearchEngine,
  ACTIVITY_SEARCH_ENGINE_GOAL,
} from "@/lib/engine/packages/activity-search-package";
export { RIMVIO_FIRST_PARTY_ENGINE_PACKAGES } from "@/lib/engine/packages";
