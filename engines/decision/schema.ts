/**
 * Decision Engine wire schema (stub) — Stage 10 types live on Research for v1.
 */
export type { ResearchDecision } from "@/engines/research/schema";

export const DECISION_ENGINE_VERSION = 0 as const;

export type DecisionEngineStub = {
  readonly version: typeof DECISION_ENGINE_VERSION;
  readonly status: "stub";
  readonly note: "Use ResearchResult.decision until Decision Engine owns Stage 10";
};
