/**
 * Observation Engine — detect external reality changes and trigger replanning.
 *
 * Watches: price changes, weather updates, availability shifts,
 * flight cancellations, user location changes.
 */

export type ObservationKind =
  | "price_change"
  | "availability_change"
  | "weather_change"
  | "schedule_change"
  | "location_change"
  | "cancellation"
  | "policy_change"
  | "user_preference_change";

export type ObservationSeverity = "info" | "warning" | "critical";

export type Observation = {
  readonly id: string;
  readonly kind: ObservationKind;
  readonly severity: ObservationSeverity;
  readonly contextId: string | null;
  readonly entityId?: string;
  readonly summaryKo: string;
  readonly previousValue?: unknown;
  readonly currentValue?: unknown;
  readonly detectedAt: string;
  readonly requiresReplan: boolean;
};

export type ObservationHandler = (observation: Observation) => void;

export type ObservationWatcher = {
  readonly watcherId: string;
  readonly kind: ObservationKind;
  readonly contextId: string | null;
  readonly intervalMs: number;
  readonly check: () => Promise<Observation | null>;
};
