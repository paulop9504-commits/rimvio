/**
 * Reality Simulation Engine — predict future state before any Reality change.
 * Layer status is always SIMULATION_ONLY (never mutates Reality).
 *
 * Flow: Draft → Simulation → Impact
 * Axes: Price · Distance · Schedule · Relations
 */

export const SIMULATION_STATUS = "SIMULATION_ONLY" as const;
export type SimulationStatus = typeof SIMULATION_STATUS;

/** Snapshot of Reality (or Workspace projection) used as baseline / candidate. */
export type RealityStateSlice = {
  readonly objectId: string;
  readonly title: string;
  readonly kind: string;
  readonly priceWon: number | null;
  readonly priceLabelKo: string | null;
  readonly rating: number | null;
  /** Minutes to itinerary / city anchor — null when unknown */
  readonly travelMinutes: number | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  /**
   * Ripple attrs — foodAccessMinutes · usjMinutes · airportMinutes · fatigueScore
   * · scheduleLoadMinutes · relatedPlaceIds (string[])
   */
  readonly attrs?: Readonly<Record<string, unknown>>;
};

export type PossibleChangeKind =
  | "replace_hotel"
  | "replace_object"
  | "adjust"
  | "move_hotel";

/** Proposed mutation — computed only; never applied to Reality by this layer. */
export type PossibleChange = {
  readonly kind: PossibleChangeKind;
  readonly target: RealityStateSlice;
  readonly labelKo?: string;
};

export type SimulationImpact = {
  readonly priceWonDelta: number | null;
  readonly travelMinutesDelta: number | null;
  readonly ratingDelta: number | null;
  /** Straight-line distance change between before/after coords (meters) */
  readonly distanceMetersDelta: number | null;
  /** Schedule / itinerary ripple summary — e.g. "일정 영향" */
  readonly scheduleImpactKo: string | null;
  readonly scheduleMinutesDelta: number | null;
  /** Related objects affected by the change */
  readonly relationsAffected: readonly string[];
  readonly relationsSummaryKo: string | null;
  /** Ripple: minutes to food cluster */
  readonly foodAccessMinutesDelta: number | null;
  /** Ripple: minutes to USJ */
  readonly usjMinutesDelta: number | null;
  /** Ripple: minutes to airport */
  readonly airportMinutesDelta: number | null;
  readonly rippleEffects: readonly string[];
  readonly summaryKo: string;
  readonly linesKo: readonly string[];
  /** UX card lines: 가격 -3만원 · 이동 +5분 · 일정 영향 */
  readonly uxLinesKo: readonly string[];
  readonly details: Readonly<Record<string, unknown>>;
};

/**
 * Simulation Result — future prediction only.
 * status is always SIMULATION_ONLY → Reality 변경 불가.
 */
export type SimulationResult = {
  readonly before: RealityStateSlice;
  readonly after: RealityStateSlice;
  readonly impact: SimulationImpact;
  readonly status: SimulationStatus;
  readonly simulationId: string;
  readonly change: PossibleChange;
  readonly workspaceId: string | null;
  /** Source Draft id when Flow = Draft → Simulation */
  readonly draftId: string | null;
  readonly createdAtIso: string;
};
