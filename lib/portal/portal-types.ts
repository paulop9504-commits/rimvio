/** Portal macro intent — stable top level across all domains. */
export type PortalIntentId = "offer" | "seek" | "together" | "join";

/** Portal L2 category — scoped under an intent. */
export type PortalCategoryId =
  | "used_goods"
  | "talent"
  | "job"
  | "real_estate"
  | "ticket"
  | "service"
  | "home"
  | "info"
  | "companion"
  | "sport"
  | "study"
  | "project"
  | "meetup"
  | "event";

export type PortalOpenSource =
  | "composer"
  | "hub"
  | "context"
  | "trade_dock";

export type PortalSession = {
  source: PortalOpenSource;
  eventId: string | null;
  composeText?: string;
  intentId: PortalIntentId | null;
  categoryId: PortalCategoryId | null;
};

export type PortalSheetStep = "intent" | "category";
