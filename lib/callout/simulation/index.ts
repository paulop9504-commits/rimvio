/**
 * What-if Simulation Engine — Draft Possible Reality.
 */

export type {
  CurrentRealitySnapshot,
  SimulationChange,
  SimulationChangeKind,
  SimulationDraft,
  SimulationImpact,
  SimulationItineraryAnchor,
  SimulationProposal,
  SimulationResult,
  SimulationScenarioKind,
} from "@/lib/callout/simulation/types";

export {
  formatMinutesDelta,
  formatWonDelta,
  parseWonAmount,
} from "@/lib/callout/simulation/parse-amount";

export {
  createSimulationDraft,
  markSimulationDraftApplied,
  runWhatIfSimulation,
  simulationImpactLinesKo,
} from "@/lib/callout/simulation/run-what-if-simulation";

export {
  assertSimulationDoesNotCommit,
  clearSimulationDraft,
  readSimulationDraft,
  SIMULATION_DRAFT_UPDATED,
  writeSimulationDraft,
} from "@/lib/callout/simulation/simulation-draft-store";

export {
  buildSimulationAnchorsFromWorkspace,
  buildSimulationProposalFromNode,
  buildCurrentRealityFromWorkspace,
} from "@/lib/callout/simulation/from-workspace";
