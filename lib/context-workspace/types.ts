/**
 * Context Workspace — live editable surface until Commit.
 * Any map-needed work (hotel · eatery · poi · amenity) edits here first.
 * @see docs/adr/022-context-workspace-first.md
 */

export const CONTEXT_WORKSPACE_VERSION = 1 as const;

export type ContextSurfaceKind =
  | "rich_card"
  | "interactive_card"
  | "embedded_preview"
  | "deep_link_card"
  | "rich_result"
  | "smart_result";

/** Map place node kinds — all edit in Workspace before Globe. */
export type ContextWorkspaceNodeKind =
  | "lodging"
  | "eatery"
  | "poi"
  | "amenity";

export type ContextWorkspaceDomain = ContextWorkspaceNodeKind;

/**
 * Action-Ready lifecycle on spatial nodes (Prepared State).
 * discover → prepare → ready → approved → committed
 */
export const ACTION_READY_STATES = [
  "discover",
  "prepare",
  "ready",
  "approved",
  "committed",
] as const;

export type ActionReadyState = (typeof ACTION_READY_STATES)[number];

export type ContextWorkspaceNode = {
  readonly id: string;
  readonly kind: ContextWorkspaceNodeKind;
  readonly placeId: string;
  readonly title: string;
  readonly summaryKo: string;
  readonly lat: number;
  readonly lng: number;
  readonly rating: number | null;
  readonly priceBand: number | null;
  readonly amountLabel: string | null;
  /** Live review volume (Google / providers) when known. */
  readonly reviewCount?: number | null;
  readonly thumbnailUrl: string | null;
  /** Extra venue photos for Peek gallery (hero = thumbnailUrl). */
  readonly galleryUrls?: readonly string[] | null;
  /** LiteAPI offer when known — Workspace → prepare → Commit. */
  readonly liteapiOfferId?: string | null;
  readonly tags: readonly string[];
  readonly visible: boolean;
  readonly selected: boolean;
  readonly bookmarked: boolean;
  readonly source: string;
  /**
   * Prepared State — AI-built Action-Ready (not Reality Commit).
   * Default omitted ≈ discover for legacy nodes.
   */
  readonly actionReadyState?: ActionReadyState | null;
  /**
   * RTS Object Owner (ADR-047) — Commit/Pay for this unit.
   * Unset = 🟡 shared / legacy until claimed.
   */
  readonly ownerUserId?: string | null;
};

export type ContextWorkspaceStatus =
  | "editing"
  | "committing"
  | "committed"
  | "closed";

export type ContextWorkspaceTransitionOp =
  | "replace_candidates"
  | "add_nodes"
  | "filter"
  | "sort"
  | "remove"
  | "select"
  | "deselect"
  | "bookmark"
  | "find_similar"
  | "compare"
  | "simulate"
  | "optimize_route"
  | "undo"
  | "redo"
  | "commit"
  | "close";

/** WHY Layer — Action · Reason · Impact (on-demand balloons). */
export type WorkspaceWhyEntry = {
  readonly actionKo: string;
  readonly reasonsKo: readonly string[];
  readonly impactsKo: readonly string[];
  readonly nodeIds: readonly string[];
  readonly atIso: string;
};

export type ContextWorkspaceFilter = {
  readonly minRating?: number | null;
  readonly maxPriceBand?: number | null;
  readonly tagIncludes?: readonly string[] | null;
  readonly queryIncludes?: string | null;
};

export type ContextWorkspaceRelationshipEdge = {
  readonly id: string;
  readonly kind: "nearby" | "compare" | "route";
  readonly fromId: string;
  readonly toId: string;
  readonly labelKo: string;
  readonly meters: number | null;
};

/** Capsule Snapshot IR — same object Resume / pack / rank consume (ADR-023). */
export type ContextWorkspaceCompilerIr = import("@/lib/context-compiler/types").ContextCompilerIrV1;

/** Day-structured Reality Draft — Chat + Map share one Prepared graph. */
export type ContextWorkspaceRealityDraft =
  import("@/lib/context-workspace/reality-draft").RealityDraft;

export type ContextWorkspaceState = {
  readonly version: typeof CONTEXT_WORKSPACE_VERSION;
  readonly workspaceId: string;
  readonly contextEventId: string;
  readonly domain: ContextWorkspaceDomain;
  readonly status: ContextWorkspaceStatus;
  readonly query: string;
  readonly summaryKo: string;
  readonly nodes: readonly ContextWorkspaceNode[];
  /** Relationship edges — 검색 → 관계 (ADR-023). */
  readonly relationshipEdges: readonly ContextWorkspaceRelationshipEdge[];
  /**
   * Context Compiler IR snapshot for Capsule Resume.
   * Preference · Reality State · graph — not re-parsed from chat dump.
   */
  readonly compilerIr: ContextWorkspaceCompilerIr | null;
  /** Prepared itinerary SSOT for Chat Day View ↔ Map pins. */
  readonly realityDraft?: ContextWorkspaceRealityDraft | null;
  readonly filter: ContextWorkspaceFilter;
  /**
   * Accumulated Reality Patch plan — stay / budget / distance constraints.
   * Soft edits patch this; Scout/Rank consume it. Not a user-facing "filter".
   */
  readonly realityPlan?: import("@/lib/context-workspace/workspace-reality-patch").WorkspaceRealityPlan | null;
  readonly selectedIds: readonly string[];
  readonly compareIds: readonly string[];
  readonly surfacePrimary: ContextSurfaceKind;
  readonly openedAtIso: string;
  readonly updatedAtIso: string;
  readonly committedAtIso: string | null;
  /** Short change note for the chat strip — Workspace is the answer. */
  readonly lastChangeKo: string | null;
  /** Last WHY — shown as node/edge balloon on demand. */
  readonly lastWhy: WorkspaceWhyEntry | null;
  readonly history: readonly ContextWorkspaceStateSnapshot[];
  readonly future: readonly ContextWorkspaceStateSnapshot[];
};

export type ContextWorkspaceStateSnapshot = {
  readonly nodes: readonly ContextWorkspaceNode[];
  readonly filter: ContextWorkspaceFilter;
  readonly selectedIds: readonly string[];
  readonly compareIds: readonly string[];
  readonly summaryKo: string;
};

export type ContextWorkspaceOpenSource =
  | "map_search"
  | "hotel_search"
  | "transition"
  | "restore"
  | "scout_patch"
  | "trip_prep"
  | "nl_open"
  | "bridge_invite_commit";

export type ContextWorkspaceOpenDetail = {
  readonly contextEventId: string;
  readonly workspaceId: string;
  readonly source: ContextWorkspaceOpenSource;
};

export function domainLabelKo(domain: ContextWorkspaceDomain): string {
  if (domain === "lodging") {
    return "숙소";
  }
  if (domain === "eatery") {
    return "맛집";
  }
  if (domain === "amenity") {
    return "편의";
  }
  return "장소";
}
