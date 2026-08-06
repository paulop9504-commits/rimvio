/**
 * Spatial Retrieval Tool result → Context Workspace Patch.
 * Thin alias over applySpatialDiscoveryToWorkspace (plan name).
 */

export {
  applySpatialDiscoveryToWorkspace as applySpatialResultToWorkspace,
  applySpatialDiscoveryToWorkspace,
  isSpatialDiscoveryUtterance,
  workspaceNodesToSpatialCandidates,
  type ApplySpatialDiscoveryToWorkspaceResult,
  type ApplySpatialDiscoveryToWorkspaceResult as ApplySpatialResultToWorkspaceResult,
} from "@/lib/spatial-retrieval/apply-spatial-discovery-to-workspace";
