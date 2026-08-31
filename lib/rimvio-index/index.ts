export type {
  ReuseDecisionKind,
  ReuseGateResult,
  ImprovementTask,
  ImprovementTaskStatus,
  CapabilityIntentResolution,
} from "@/lib/rimvio-index/types";
export {
  REUSE_SIMILARITY_REUSE,
  REUSE_SIMILARITY_IMPROVE,
} from "@/lib/rimvio-index/types";
export {
  queryCapabilitySemanticIndex,
  computeCapabilitySimilarity,
  rankHitsBySimilarity,
} from "@/lib/rimvio-index/semantic-search";
export { evaluateReuseGate } from "@/lib/rimvio-index/reuse-gate";
export {
  readImprovementTasks,
  spawnImprovementTaskFromReuseGate,
  spawnImprovementTaskFromDevRequest,
  spawnImprovementTaskFromAnomaly,
  updateImprovementTaskStatus,
  resetImprovementTasksForTests,
} from "@/lib/rimvio-index/improvement-task-pool";
export { resolveCapabilityIntent } from "@/lib/rimvio-index/resolve-capability-intent";
export {
  expandCapabilityDependencies,
  findRelatedCapabilities,
  capabilityDependenciesOfTool,
  buildDependencyGraphEdges,
  assertUnverifiedCannotCallTrusted,
} from "@/lib/rimvio-index/graph";
