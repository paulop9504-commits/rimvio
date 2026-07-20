/**
 * Graph Command IR — L1 Intent only.
 * Natural language compiles here; never search/booking APIs.
 */

export const GRAPH_COMMAND_VERSION = 2 as const;

export const GRAPH_COMMAND_OPS = [
  "pin_node",
  "search_project",
  "filter",
  "compare",
  "reserve_prep",
  "payment_prep",
  "delete_node",
  "group_nodes",
  "move_context",
  "create_note",
  "style_pin",
  "set_visibility",
  "share_context",
  "reason_pick",
  "simulate",
] as const;

export type GraphCommandOp = (typeof GRAPH_COMMAND_OPS)[number];

export type GraphEntityDomain = "lodging" | "eatery" | "poi";

export type GraphEntityRef = {
  readonly labelKo: string;
  readonly nodeId?: string | null;
};

export type GraphFilterPredicate = {
  readonly minRating?: number | null;
  readonly maxWalkMinutes?: number | null;
  readonly reservableOnly?: boolean | null;
  /** “현지인” / local favorite only. */
  readonly localFavoriteOnly?: boolean | null;
  readonly domain?: GraphEntityDomain | "all" | null;
  readonly sortBy?: "price_asc" | "rating_desc" | "walk_asc" | "local_desc" | null;
};

export type GraphPinAccent = "red" | "blue" | "green" | "orange" | "default";

export type GraphCommand =
  | {
      readonly op: "pin_node";
      readonly targetRef: GraphEntityRef;
    }
  | {
      readonly op: "search_project";
      readonly query: string;
      readonly domain: GraphEntityDomain;
      readonly anchorRef?: GraphEntityRef | null;
    }
  | {
      readonly op: "filter";
      readonly predicate: GraphFilterPredicate;
    }
  | {
      readonly op: "compare";
      readonly leftRef: GraphEntityRef;
      readonly rightRef: GraphEntityRef;
    }
  | {
      readonly op: "reserve_prep";
      readonly targetRef: GraphEntityRef;
    }
  | {
      readonly op: "payment_prep";
      readonly targetRef: GraphEntityRef;
    }
  | {
      readonly op: "delete_node";
      readonly targetRef: GraphEntityRef;
    }
  | {
      readonly op: "group_nodes";
      readonly memberRefs: readonly GraphEntityRef[];
      readonly labelKo?: string | null;
    }
  | {
      readonly op: "move_context";
      readonly targetRef: GraphEntityRef;
      readonly toContextEventId: string;
      readonly folderLabelKo?: string | null;
    }
  | {
      readonly op: "create_note";
      readonly targetRef: GraphEntityRef;
      readonly bodyKo: string;
    }
  | {
      readonly op: "style_pin";
      readonly targetRef: GraphEntityRef;
      readonly accent: GraphPinAccent;
    }
  | {
      readonly op: "set_visibility";
      readonly targetRef: GraphEntityRef;
      readonly alwaysVisible: boolean;
    }
  | {
      readonly op: "share_context";
      readonly targetRef: GraphEntityRef;
    }
  | {
      readonly op: "reason_pick";
      readonly promptKo: string;
    }
  | {
      readonly op: "simulate";
      readonly scenarioKo: string;
    };

export type SessionGraphNodeKind =
  | GraphEntityDomain
  | "compare"
  | "anchor"
  | "group"
  | "note"
  | "simulation";

export type SessionGraphNode = {
  readonly id: string;
  readonly labelKo: string;
  readonly kind: SessionGraphNodeKind;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly rating: number | null;
  readonly walkMinutes: number | null;
  readonly reservable: boolean;
  readonly localFavorite: boolean;
  readonly priceBand: number | null;
  readonly pinned: boolean;
  readonly visible: boolean;
  readonly alwaysVisible: boolean;
  readonly parentId: string | null;
  readonly groupId: string | null;
  readonly accent: GraphPinAccent;
  readonly projectFolderKo: string | null;
  readonly attrs: Readonly<Record<string, string | number | boolean | null>>;
};

export type SessionGraphEdge = {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly kind: "nearby" | "compare" | "anchor" | "group" | "note";
  readonly labelKo: string;
};

export type SessionGraphV1 = {
  readonly version: typeof GRAPH_COMMAND_VERSION;
  readonly contextEventId: string;
  readonly nodes: readonly SessionGraphNode[];
  readonly edges: readonly SessionGraphEdge[];
  readonly selectionIds: readonly string[];
  readonly activeFilters: GraphFilterPredicate;
  readonly compareClusterId: string | null;
  readonly projectFolders: readonly string[];
  readonly anchorLat: number | null;
  readonly anchorLng: number | null;
  readonly updatedAtIso: string;
};

export type GraphCommandApplyResult = {
  readonly ok: true;
  readonly contextEventId: string;
  readonly commands: readonly GraphCommand[];
  readonly graph: SessionGraphV1;
  readonly assistantReplyKo: string;
  readonly reservedOpIds: readonly string[];
};
