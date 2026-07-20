export {
  PROJECTION_ENGINE_VERSION,
  PROJECTION_STAGES,
  type ProjectionStage,
  type ProjectionProjectKind,
  type ProjectionNodeKind,
  type ProjectionRelationKind,
  type ProjectionClusterKind,
  type SuggestedTaskVerb,
  type ProjectionOntologyNode,
  type ProjectionOntologyRelation,
  type ProjectedGlobeEntity,
  type ProjectionCluster,
  type SuggestedProjectionTask,
  type ProjectionCommitCandidate,
  type RealityProjection,
} from "@/lib/projection-engine/types";
export {
  PROJECTION_ENGINE_SYSTEM_PROMPT,
  buildProjectionEngineUserPrompt,
} from "@/lib/projection-engine/projection-engine-prompt";
export {
  PROJECTION_STAGE_PROGRESS_KO,
  PROJECTION_STAGE_DONE_KO,
  PROJECTION_STAGE_TITLE_KO,
  projectionStageProgressKo,
} from "@/lib/projection-engine/progress-copy";
export {
  inferProjectionGoal,
  type InferredProjectionGoal,
} from "@/lib/projection-engine/infer-project-goal";
export {
  compileRealityProjection,
  advanceProjectionStage,
} from "@/lib/projection-engine/compile-reality-projection";
