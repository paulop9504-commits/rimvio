/**
 * Rimvio Engine — L3 Domain Executor package contract.
 * Blueprint is read-only input; Commit stays at L5.
 * @see docs/RIMVIO_ENGINE.md (product) · docs/RIMVIO_CONTEXT_OS_ARCHITECTURE.md
 */

import type {
  ContextContainerKind,
  DomainExecutorId,
} from "@/lib/context-blueprint/blueprint-constants";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { RimvioEnginePackage } from "@/lib/engine/engine-package";

/** @deprecated Use RimvioEnginePackage — kept as registry alias. */
export type RimvioEngineDefinition<TDomainPlan = unknown> =
  RimvioEnginePackage<TDomainPlan>;

/** Marketplace / orchestrator SKU — not the same as DomainExecutorId. */
export const RIMVIO_ENGINE_IDS = [
  "flight_booking",
  "lodging_search",
  "local_amenity_search",
  "eatery_search",
  "activity_search",
  "trip_experience_search",
  "transit_navigate",
  "finance_prep",
] as const;

export type RimvioEngineId = (typeof RIMVIO_ENGINE_IDS)[number];

export type RimvioEngineGoal = {
  readonly id: string;
  readonly goalKo: string;
};

/** Engine-owned lifecycle — domain metadata only until Commit. */
export const RIMVIO_ENGINE_RUN_STATES = [
  "idle",
  "planning",
  "awaiting_slots",
  "scouting",
  "prepared",
  "awaiting_approval",
  "committed",
] as const;

export type RimvioEngineRunState = (typeof RIMVIO_ENGINE_RUN_STATES)[number];

export type RimvioEngineTurnInput = {
  readonly message: string;
  readonly event: EventCandidate | null | undefined;
  readonly userLat?: number | null;
  readonly userLng?: number | null;
  readonly now?: Date;
  readonly expressReady?: boolean;
};

export type RimvioEnginePlan<TDomainPlan = unknown> = {
  readonly engineId: RimvioEngineId;
  readonly executorId: DomainExecutorId;
  readonly containerKind: ContextContainerKind;
  readonly goal: RimvioEngineGoal;
  readonly message: string;
  readonly readyForScout: boolean;
  readonly steps: readonly string[];
  /** Wrapped domain one-shot plan (lodging-prep · trip-experience, …). */
  readonly domainPlan: TDomainPlan;
};

// Runtime contract lives on RimvioEnginePackage — see engine-package.ts
