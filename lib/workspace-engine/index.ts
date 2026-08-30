/**
 * Workspace Engine — Ontology · Capability · View → Workspace composition.
 * @see docs/adr/067-workspace-engine-three-layers.md
 */

export {
  WORKSPACE_ENGINE_LAYERS,
  WORKSPACE_LAYER_SPECS,
  isViewLayerArtifact,
  type WorkspaceEngineLayer,
  type WorkspaceLayerSpec,
} from "@/lib/workspace-engine/layers";

export {
  RIMVIO_PRODUCER_KINDS,
  RIMVIO_PRODUCER_KIND_SPECS,
  producerKindLabelKo,
  type RimvioProducerKind,
  type RimvioProducerKindSpec,
} from "@/lib/workspace-engine/producer-kind";

export {
  WDK_VIEW_PRIMITIVES,
  WDK_COMPOSITION_PRIMITIVES,
  listWdkPrimitives,
  wdkViewPrimitiveDef,
  type WdkPrimitiveDef,
  type WdkPrimitiveId,
  type WdkViewPrimitiveId,
} from "@/lib/workspace-engine/primitives";

export {
  VIEW_CONTRACT_KINDS,
  type ViewContractKind,
  type ViewContractSpec,
  type ViewExtensionDraft,
  type ViewExtensionValidationResult,
} from "@/lib/workspace-engine/view-contracts/types";

export {
  MAP_VIEW_CONTRACT,
  MAP_VIEW_CONTRACT_VERSION,
  geoObjectsToMapPins,
  validateMapViewExtension,
  workspaceMapPinToGeoObject,
  type GeoObject,
} from "@/lib/workspace-engine/view-contracts/map-view-contract";

export {
  listViewContracts,
  resolveViewContract,
} from "@/lib/workspace-engine/view-contracts/registry";

export {
  detectOntologyTypeOverlap,
  validateDomainOntologySchema,
  type DomainOntologySchema,
  type OntologyObjectType,
  type OntologyRelationDef,
  type OntologySchemaValidationResult,
} from "@/lib/workspace-engine/ontology/domain-ontology-schema";

export {
  PROPERTY_ONTOLOGY_V1,
  SEED_ONTOLOGY_SCHEMAS,
  TRAVEL_ONTOLOGY_V1,
} from "@/lib/workspace-engine/ontology/seed-schemas";

export {
  getDomainOntologySchema,
  listDomainOntologySchemas,
  listOntologiesByDomain,
  registerDomainOntologySchema,
  resetOntologyRegistryForTests,
} from "@/lib/workspace-engine/ontology/registry";

export {
  bindObjectTypeToMapView,
  planWorkspaceFromGoal,
  type WorkspaceCompositionPlan,
  type WorkspaceCompositionSlot,
} from "@/lib/workspace-engine/workspace-composition";

export type { WorkspaceExtensionSubmission } from "@/lib/workspace-engine/extension/submission";
export {
  validateWorkspaceExtensionSubmission,
  WORKSPACE_EXTENSION_PIPELINE,
} from "@/lib/workspace-engine/extension/submission";

export {
  ONTOLOGY_PRODUCER_GUIDE,
  VIEW_PRODUCER_GUIDE,
  WDK_OVERVIEW_STANDARD,
} from "@/lib/workspace-engine/standards/wdk-standards";
