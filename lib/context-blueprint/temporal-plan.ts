/**
 * L2 sub-contract — WHEN (TemporalPlan)
 * Time windows and phases — not domain execution.
 * @see docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md § Blueprint sub-contracts
 */

import type { ContextBlueprintPeriod } from "@/lib/context-blueprint/wire-fields";

export const TEMPORAL_PLAN_STATUSES = [
  "planning",
  "scheduled",
  "in_progress",
  "complete",
] as const;

export type TemporalPlanStatus = (typeof TEMPORAL_PLAN_STATUSES)[number];

/** Phase linked to a spatial anchor when known. */
export type TemporalPhase = {
  readonly id: string;
  readonly label: string;
  readonly anchorId?: string | null;
  readonly windowStartIso?: string | null;
  readonly windowEndIso?: string | null;
  readonly flexible?: boolean;
};

/**
 * TemporalPlan — WHEN execution windows apply.
 * Distinct from SpatialPlan (WHERE) and ResourcePlan (WHAT is needed).
 */
export type TemporalPlan = {
  readonly period: ContextBlueprintPeriod;
  readonly timezone?: string | null;
  readonly phases: readonly TemporalPhase[];
  readonly status: TemporalPlanStatus;
};

export type ComposeTemporalPlanInput = {
  period: ContextBlueprintPeriod;
  timezone?: string | null;
  phases?: readonly TemporalPhase[];
  status?: TemporalPlanStatus;
};

export function composeTemporalPlan(
  input: ComposeTemporalPlanInput,
): TemporalPlan {
  return {
    period: input.period,
    timezone: input.timezone ?? null,
    phases: [...(input.phases ?? [])],
    status: input.status ?? "planning",
  };
}
