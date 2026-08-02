/**
 * Rimvio Reality Simulation Engine
 *
 * Predict future Reality state before any change.
 * Flow: Draft → Simulation → Impact
 * Axes: Price · Distance · Schedule · Relations
 * Always SIMULATION_ONLY — Reality 변경 불가.
 */

export type {
  PossibleChange,
  PossibleChangeKind,
  RealityStateSlice,
  SimulationImpact,
  SimulationResult,
  SimulationStatus,
} from "@/lib/simulation-engine/types";

export { SIMULATION_STATUS } from "@/lib/simulation-engine/types";

export {
  analyzeSimulationImpact,
  formatHotelChangeSimulationUxKo,
  formatPriceManwonUx,
  formatTravelDeltaUx,
  simulationImpactLinesKo,
} from "@/lib/simulation-engine/impact-analyzer";

export {
  buildRealityStateSlice,
  runRealitySimulation,
  simulateHotelChange,
  simulateHotelMoveWithRipple,
} from "@/lib/simulation-engine/simulation";

export {
  simulateFromDraft,
  simulateHotelChangeFromSlices,
} from "@/lib/simulation-engine/from-draft";

export {
  assertSimulationOnly,
  clearSimulationsForTests,
  listSimulations,
  readLatestSimulation,
  readSimulation,
  rejectRealityMutationFromSimulation,
  saveSimulation,
  SIMULATION_UPDATED,
} from "@/lib/simulation-engine/simulation-store";
