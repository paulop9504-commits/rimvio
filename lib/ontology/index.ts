export type {
  BridgeNode,
  CaptureNode,
  ExperienceNode,
  ExperienceSubgraph,
  OntologyObjectKind,
} from "@/lib/ontology/nodes/types";

export {
  bridgeInviteNotificationId,
  locationConfirmNotificationId,
  parseLocationEventIdFromNotificationId,
} from "@/lib/ontology/notifications/notification-id";
export {
  persistNotificationDismiss,
  readDismissedLocationEventIds,
  readDismissedNotificationIds,
  resetNotificationStoreForTests,
} from "@/lib/ontology/notifications/notification-store";

export type {
  RimvioActionFamily,
  RimvioActionType,
  RimvioActionTypeId,
} from "@/lib/ontology/actions/types";

export type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
export type { FeedCaptureKind, FeedCaptureFragment } from "@/lib/ontology/feed-capture-wire";
export {
  EXPERIENCE_BRIDGE_MAX_PARTICIPANTS,
  EXPERIENCE_BRIDGE_META_KEYS,
} from "@/lib/ontology/experience-bridge-meta-keys";
export { isBridgeSharedEvent } from "@/lib/ontology/is-bridge-shared-event";

export type {
  CaptureEntity,
  ExperienceEntity,
  KnowledgeEntityNode,
  PersonEntity,
  PlaceEntity,
  RimvioEntity,
  RimvioEntityId,
  RimvioEntityKind,
  ThreadEntity,
  ThreadKind,
} from "@/lib/ontology/entity-types";
export {
  ENTITY_EDGE_EXTENSION_KINDS,
  ENTITY_EDGE_KINDS,
  ENTITY_GRAPH_CONTRACT_VERSION,
  EMPTY_ENTITY_GRAPH_SNAPSHOT,
  mergeEntityEdgeEvidence,
} from "@/lib/ontology/edge-types";
export type {
  EntityEdge,
  EntityEdgeEvidence,
  EntityEdgeKind,
  EntityGraphSnapshot,
} from "@/lib/ontology/edge-types";
export {
  entitiesFromEventCandidate,
  entityFromKnowledgeEntity,
  entityFromPinEntity,
} from "@/lib/ontology/entity-adapters";
export {
  readEntityGraphSnapshot,
  resetEntityGraphStoreForTests,
  upsertEntityEdge,
} from "@/lib/ontology/edge-store";
export type {
  MediaGuideCandidateSearchProfile,
  MediaGuideCandidateSource,
  MediaGuideMoment,
  MediaGuideNode,
  MediaGuideNodeId,
  MediaGuidePlaceCandidate,
  MediaGuideSnapshot,
  MediaGuideSourceKind,
  MediaGuideTrustLevel,
} from "@/lib/ontology/media-guide-types";
export {
  EMPTY_MEDIA_GUIDE_SNAPSHOT,
  MEDIA_GUIDE_CANDIDATE_SOURCES,
  MEDIA_GUIDE_SOURCE_KINDS,
  MEDIA_GUIDE_SNAPSHOT_VERSION,
  MEDIA_GUIDE_TRUST_LEVELS,
} from "@/lib/ontology/media-guide-types";
export {
  queryMediaGuidesForEntity,
  queryMediaGuidesForEvent,
  readMediaGuideSnapshot,
  replaceMediaGuidesForExperience,
  resetMediaGuideStoreForTests,
  writeMediaGuideSnapshot,
} from "@/lib/ontology/media-guide-store";
export { resolveMediaGuideNodesForEvent } from "@/lib/ontology/media-guide-enrichment";
export { inferMediaGuidePlaceCandidates } from "@/lib/ontology/media-guide-place-inference";
export { materializeEntityEdges } from "@/lib/ontology/materialize-entity-edges";
export { queryEntityNeighbors } from "@/lib/ontology/graph-query";
export {
  filterEdgeEvidenceForRecall,
  isEdgeActiveForRecall,
  readArchivedEventIdSet,
} from "@/lib/ontology/filter-active-edge-evidence";
export {
  ENTITY_EDGE_KINDS_PHASE2_RESERVED,
  type EntityEdgeEvidencePhase2Reserved,
  type EntityEdgeKindPhase2Reserved,
} from "@/lib/ontology/edge-types-phase2-reserved";
export {
  materializeBridgeCoParticipantEdge,
  materializeBridgeCoParticipantEdgeFromEvent,
  materializeGatheringLinkEdge,
  materializeMarketEdge,
  materializeMarketEdgeFromCompletionEvent,
  materializePhase2EntityEdgesFromEvent,
} from "@/lib/ontology/materialize-entity-edges-phase2";
