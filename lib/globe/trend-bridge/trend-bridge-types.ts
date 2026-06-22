export type TrendBridgeMapStyle = "context-mist";

export type TrendBridgeFeature = {
  bridgeId: string;
  displayName: string;
  aliases: readonly string[];
  parentBridgeId?: string | null;
  aggregateTag: string;
  mapStyle: TrendBridgeMapStyle;
  sourceRef: string;
  hudVisible?: boolean;
};

export type TrendBridgeZone = {
  id: string;
  bridgeId: string;
  label: string;
  lat: number;
  lng: number;
  /** 0–1 visual weight for mist layer */
  intensity: number;
  peakHour?: string | null;
  contextSummary?: string | null;
};

export type TrendBridgeSettings = {
  enabled: boolean;
  activeBridgeId: string | null;
  /** align = go with the flow; avoid = skip crowd peak */
  pulseIntent: "align" | "avoid";
};
