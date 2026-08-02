/**
 * Mobile Workspace — Interaction Model (UI state).
 * Map Canvas + Command Bar + Expandable Sheet.
 * No multi Floating Windows on mobile.
 */

export const MOBILE_CALLOUT_MODES = [
  "compact",
  "expanded",
  "full",
] as const;

export type MobileCalloutMode = (typeof MOBILE_CALLOUT_MODES)[number];

export type MobileWorkspaceEntityKind =
  | "hotel"
  | "restaurant"
  | "attraction"
  | "station"
  | "poi"
  | "other";

export type MobileWorkspaceEntity = {
  readonly id: string;
  readonly kind: MobileWorkspaceEntityKind;
  readonly title: string;
  readonly lat: number;
  readonly lng: number;
  readonly score: number | null;
  readonly subtitleKo: string | null;
  readonly priceLabelKo: string | null;
};

export type MobileWorkspaceRelationKind =
  | "nearby"
  | "route"
  | "schedule"
  | "similar";

export type MobileWorkspaceRelation = {
  readonly id: string;
  readonly kind: MobileWorkspaceRelationKind;
  readonly fromId: string;
  readonly toId: string;
  readonly labelKo: string;
  readonly meters: number | null;
  readonly walkMinutes: number | null;
};

export type MobileWorkspaceIntent = {
  readonly rawText: string;
  readonly action: string;
  readonly target: string;
  readonly constraint: Readonly<Record<string, unknown>>;
};

/**
 * Mobile WorkspaceState — Spatial AI session UI.
 * Reality Objects remain SSOT elsewhere; this is projection + interaction.
 */
export type MobileWorkspaceState = {
  readonly contextId: string;
  readonly contextTitleKo: string;
  readonly anchorEntityId: string | null;
  readonly entities: readonly MobileWorkspaceEntity[];
  readonly relations: readonly MobileWorkspaceRelation[];
  readonly activeEntityId: string | null;
  readonly calloutMode: MobileCalloutMode;
  readonly currentIntent: MobileWorkspaceIntent | null;
  readonly actionMenuEntityId: string | null;
  readonly updatedAtIso: string;
};

export type MobileWorkspaceAction =
  | {
      readonly type: "hydrate";
      readonly contextId: string;
      readonly contextTitleKo: string;
      readonly entities: readonly MobileWorkspaceEntity[];
      readonly relations?: readonly MobileWorkspaceRelation[];
      readonly anchorEntityId?: string | null;
    }
  | { readonly type: "set_active"; readonly entityId: string | null }
  | { readonly type: "set_callout_mode"; readonly mode: MobileCalloutMode }
  | { readonly type: "expand_callout" }
  | { readonly type: "collapse_callout" }
  | { readonly type: "close_callout" }
  | { readonly type: "set_anchor"; readonly entityId: string | null }
  | {
      readonly type: "apply_intent";
      readonly intent: MobileWorkspaceIntent;
      readonly entities?: readonly MobileWorkspaceEntity[];
      readonly relations?: readonly MobileWorkspaceRelation[];
    }
  | { readonly type: "open_action_menu"; readonly entityId: string }
  | { readonly type: "close_action_menu" }
  | { readonly type: "clear" };
