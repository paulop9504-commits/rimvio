/**
 * Normalized Reality IR from rail Acquire (before Workspace Patch).
 */

import type { RealityProviderId } from "@/lib/reality-provider/types";

export type RealityLineObject = {
  readonly id: string;
  readonly kind: "line";
  readonly titleKo: string;
  readonly shortLabelKo: string;
  readonly color: string;
  readonly operatorHint: string | null;
};

export type RealityStationObject = {
  readonly id: string;
  readonly kind: "station";
  readonly titleKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly lineIds: readonly string[];
  readonly hub: boolean;
};

export type RealityRailNetworkBundle = {
  readonly providerId: RealityProviderId;
  readonly regionKo: string | null;
  /** Which MapLibre overlay family to project */
  readonly family:
    | "osaka_jr"
    | "osaka_metro"
    | "japan_metro"
    | "shinkansen"
    | "korea_rail";
  readonly labelKo: string;
  readonly lines: readonly RealityLineObject[];
  readonly stations: readonly RealityStationObject[];
};
