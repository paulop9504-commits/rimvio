/**
 * Workspace Capability Objects — panels AI opens/closes/resizes/moves.
 * Not fixed app tabs. Cursor-like: intent → needed tools only.
 * Lives inside Context Workspace (ADR-022); does not replace Workspace SDK bones (ADR-026).
 */

export const WORKSPACE_CAPABILITY_IDS = [
  "search_summary",
  "candidate_list",
  "ai_decision",
  "compare",
  "inspector",
  "trip_overview",
  "day_rail",
  "map",
  "timeline",
  "budget",
  "booking",
  "weather",
  "traffic",
  "payment",
  "cancellation",
  "members",
  "permission",
  "suggestion",
  "comments",
  "journal",
  "history",
  "analytics",
  "ai_status",
  "commit_gate",
] as const;

export type WorkspaceCapabilityId = (typeof WORKSPACE_CAPABILITY_IDS)[number];

/** User Job → which Capability Objects to open (AI owned). */
export const WORKSPACE_CAPABILITY_INTENT_IDS = [
  "eatery_search",
  "trip_plan",
  "lodging_book",
  "share_collab",
  "generic_map",
] as const;

export type WorkspaceCapabilityIntentId =
  (typeof WORKSPACE_CAPABILITY_INTENT_IDS)[number];

export type CapabilitySlot =
  | "header"
  | "left"
  | "center"
  | "right"
  | "bottom"
  | "overlay"
  | "floating";

export type CapabilitySize = "sm" | "md" | "lg" | "xl" | "fill";

export type WorkspaceCapabilityDef = {
  readonly id: WorkspaceCapabilityId;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly defaultSlot: CapabilitySlot;
  readonly defaultSize: CapabilitySize;
  /** Soft hint — product capability category. */
  readonly kind: "discover" | "plan" | "book" | "collab" | "system";
};

export type WorkspaceCapabilityLayoutItem = {
  readonly id: WorkspaceCapabilityId;
  readonly open: boolean;
  readonly size: CapabilitySize;
  readonly slot: CapabilitySlot;
  readonly order: number;
};

export type WorkspaceCapabilityLayout = {
  readonly contextEventId: string;
  readonly intentId: WorkspaceCapabilityIntentId;
  readonly items: readonly WorkspaceCapabilityLayoutItem[];
  readonly focusedDay: number | null;
  readonly updatedAtIso: string;
};

export type WorkspaceCapabilityOp =
  | {
      readonly type: "open";
      readonly id: WorkspaceCapabilityId;
      readonly size?: CapabilitySize;
      readonly slot?: CapabilitySlot;
    }
  | { readonly type: "close"; readonly id: WorkspaceCapabilityId }
  | {
      readonly type: "resize";
      readonly id: WorkspaceCapabilityId;
      readonly size: CapabilitySize;
    }
  | {
      readonly type: "move";
      readonly id: WorkspaceCapabilityId;
      readonly slot: CapabilitySlot;
      readonly order?: number;
    }
  | {
      readonly type: "apply_recipe";
      readonly intentId: WorkspaceCapabilityIntentId;
    }
  | { readonly type: "set_focused_day"; readonly day: number | null }
  | { readonly type: "clear" };

export type WorkspaceCapabilityRecipe = {
  readonly intentId: WorkspaceCapabilityIntentId;
  readonly labelKo: string;
  readonly open: readonly {
    readonly id: WorkspaceCapabilityId;
    readonly slot?: CapabilitySlot;
    readonly size?: CapabilitySize;
    readonly order?: number;
  }[];
};
