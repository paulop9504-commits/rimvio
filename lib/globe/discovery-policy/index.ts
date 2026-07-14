export {
  EXPLORATION_MODES,
  isExplorationMode,
  resolveExplorationMode,
  type ExplorationMode,
  type ResolveExplorationModeInput,
} from "@/lib/globe/discovery-policy/exploration-mode";

export {
  applyExplorationMode,
  guardThresholdForDomain,
  type ExplorationPolicyKnobs,
} from "@/lib/globe/discovery-policy/apply-exploration-mode";

export {
  clearExplorationModeOverride,
  readExplorationModeOverride,
  subscribeExplorationModeOverride,
  writeExplorationModeOverride,
} from "@/lib/globe/discovery-policy/exploration-mode-session-store";

export { explorationScoreBias } from "@/lib/globe/discovery-policy/exploration-score-bias";

export {
  diversifyScoredRecommendations,
  lodgingChainScorePenalty,
} from "@/lib/globe/discovery-policy/diversify-scored-recommendations";

export {
  computeScoreDistribution,
  type ScoreDistributionTelemetry,
} from "@/lib/globe/discovery-policy/compute-score-distribution";

export {
  logExplorationScoutScoreTelemetry,
  type ExplorationScoutScoreTelemetryInput,
} from "@/lib/globe/discovery-policy/log-exploration-score-telemetry";
