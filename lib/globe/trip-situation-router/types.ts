/** Situation router stages — spawn → destination → departure confirm → domain. */
export const TRIP_SITUATION_ROUTER_STAGES = [
  "idle",
  "needs_destination",
  "needs_departure_confirm",
  "pick_departure_hub",
  "ready_for_domain",
] as const;

export type TripSituationRouterStage =
  (typeof TRIP_SITUATION_ROUTER_STAGES)[number];

export type TripSituationRouterAction =
  | "spawn"
  | "destination"
  | "departure_confirm"
  | "departure_other"
  | "departure_hub"
  | "lodging"
  | "eatery";

export type TripSituationRouterChip = {
  readonly id: string;
  readonly label: string;
  readonly action: TripSituationRouterAction;
  /** Composer submit text when action is spawn / lodging / eatery. */
  readonly submitText?: string;
  readonly departureHubId?: import("@/lib/globe/departure-hub-airports").DepartureHubAirportId;
  readonly homeLabel?: string;
};

export type TripSituationRouterState = {
  readonly stage: TripSituationRouterStage;
  readonly reasonKo: string;
  readonly choices: readonly TripSituationRouterChip[];
};
