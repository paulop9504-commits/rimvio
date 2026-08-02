/**
 * What-if Simulation — Possible Reality over Draft only.
 * Never Reality Commit.
 *
 * Current Reality → Simulation Layer → Possible Reality
 */

export type SimulationChangeKind =
  | "budget"
  | "time"
  | "distance"
  | "schedule"
  | "object";

export type SimulationChange = {
  readonly id: string;
  readonly kind: SimulationChangeKind;
  readonly labelKo: string;
  readonly valueKo: string;
  /** Signed numeric delta (won · minutes · meters) */
  readonly delta: number;
};

export type SimulationImpact = {
  /** KRW delta — negative = cheaper */
  readonly budget: number;
  /** Schedule / itinerary minutes delta */
  readonly time: number;
  /** Access / walk minutes delta (거리 as time-to) */
  readonly distance: number;
};

export type SimulationResult = {
  readonly changes: readonly SimulationChange[];
  readonly impact: SimulationImpact;
};

export type SimulationScenarioKind = "change_hotel" | "change_object";

/** Current Reality slice used as simulation baseline. */
export type CurrentRealitySnapshot = {
  readonly objectId: string;
  readonly title: string;
  readonly typeLabelKo: string;
  readonly priceWon: number | null;
  readonly priceLabelKo: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly dayLabelKo: string | null;
};

/** Proposed object in Simulation Layer. */
export type SimulationProposal = {
  readonly objectId: string;
  readonly title: string;
  readonly priceWon: number | null;
  readonly priceLabelKo: string | null;
  readonly lat: number;
  readonly lng: number;
};

export type SimulationItineraryAnchor = {
  readonly day: number;
  readonly labelKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly nodeId: string | null;
};

/**
 * Draft-only Possible Reality — never stamped as Commit.
 * Architecture: Current Reality → Simulation Layer → Possible Reality
 */
export type SimulationDraft = {
  readonly simulationId: string;
  readonly contextId: string;
  readonly scenarioKind: SimulationScenarioKind;
  readonly status: "preview" | "applied_to_draft";
  readonly current: CurrentRealitySnapshot;
  readonly proposal: SimulationProposal;
  readonly result: SimulationResult;
  readonly createdAtIso: string;
  readonly appliedAtIso: string | null;
};
