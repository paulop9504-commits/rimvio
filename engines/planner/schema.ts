/**
 * Planner Engine wire schema (stub).
 * Runtime remains `lib/context-execution` until Planner Engine owns the stage.
 */
export const PLANNER_ENGINE_VERSION = 0 as const;

export type PlannerEngineStub = {
  readonly version: typeof PLANNER_ENGINE_VERSION;
  readonly status: "stub";
};
