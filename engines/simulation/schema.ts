/**
 * Simulation Engine wire schema (stub).
 */
export const SIMULATION_ENGINE_VERSION = 0 as const;

export type SimulationEngineStub = {
  readonly version: typeof SIMULATION_ENGINE_VERSION;
  readonly status: "stub";
};
