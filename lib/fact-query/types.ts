/** Fact Query — deterministic answer + Globe projection (Tier A). */

export type FactQueryKind =
  | "transit_max_interchange"
  | "transit_station_lines"
  | "poi_hotspots"
  | "weather_lookup"
  | "distance_lookup"
  | "schedule_feasibility"
  | "transit_route_lookup"
  | "transit_last_train"
  | "transit_realtime_lookup"
  | "transit_crowding_lookup"
  | "midpoint_meeting"
  | "place_lookup"
  | "unsupported";

export type FactMarkerKind =
  | "transit_hub"
  | "hotspot"
  | "poi"
  | "highlight";

export type FactEvidenceItem = {
  readonly id: string;
  readonly labelKo: string;
  readonly detailKo: string | null;
  readonly lat: number;
  readonly lng: number;
  readonly kind: FactMarkerKind;
  readonly score: number | null;
  readonly source: string;
};

export type FactAnswerWire = {
  readonly queryId: string;
  readonly kind: FactQueryKind;
  readonly headlineKo: string;
  readonly summaryKo: string;
  readonly evidence: readonly FactEvidenceItem[];
  readonly highlightId: string | null;
  readonly cityLabelKo: string | null;
  readonly ranTool: boolean;
  readonly sourceKo: string;
};

export type FactQueryClassification = {
  readonly kind: FactQueryKind;
  readonly cityLabelKo: string | null;
  readonly cityId: string | null;
  readonly recipientQuery: string | null;
};

export type FactProjectionState = {
  readonly wire: FactAnswerWire;
  readonly publishedAtIso: string;
};

export const FACT_PROJECTION_EVENT = "rimvio:fact-projection" as const;
