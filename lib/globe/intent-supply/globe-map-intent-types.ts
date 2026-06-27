/** Globe map prompt — NL intent → context-linked resource supply. */

export type GlobeMapIntentKind =
  | "lodging_supply"
  | "place_food_supply"
  | "people_recall"
  | "context_connect"
  | "market_compose"
  | "navigation_action"
  | "unknown";

export type GlobeMapIntent = {
  kind: GlobeMapIntentKind;
  /** L2 label for dev / prompt rail. */
  supplyTarget: "lodging" | "eatery" | "memory" | "context" | "market" | "navigation" | null;
};

export type GlobeMapIntentSupplyAck = {
  eventId: string;
  intentKind: GlobeMapIntentKind;
  intentLabelKo: string;
  summaryKo: string;
  signalChips: readonly string[];
  suppliedResourceCount: number;
};

export type GlobeMapIntentSupplyPending = {
  intentLabelKo: string;
  signalChips: readonly string[];
};

export type GlobeMapIntentSupplyResult =
  | {
      status: "supplied";
      ack: GlobeMapIntentSupplyAck;
      lodgingEventId?: string;
      foodEventId?: string;
    }
  | { status: "pass"; pass: "market" | "navigation" | "discovery" };
