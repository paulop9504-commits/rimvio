/**
 * Reality Explorer — Cursor File Tree analog for Rimvio.
 *
 * Cursor:  Folder → File → Code
 * Rimvio:  Project → Context → Entity → Action → Commit
 *
 * Chat is ingress only. Work happens by exploring the Project Tree;
 * Ontology and Globe Projection are two views of the same nodes.
 */

export const REALITY_EXPLORER_VERSION = 1 as const;

/** Top-level explorer sections (left rail). */
export const REALITY_EXPLORER_ROOTS = [
  "globe",
  "ontology",
  "execution",
  "timeline",
] as const;

export type RealityExplorerRoot = (typeof REALITY_EXPLORER_ROOTS)[number];

/** Project Tree sector folders (Cursor folder roles). */
export const PROJECT_TREE_SECTORS = [
  "flight",
  "hotel",
  "food",
  "transit",
  "budget",
  "schedule",
  "spots",
  "tickets",
  "tasks",
  "rental",
] as const;

export type ProjectTreeSector = (typeof PROJECT_TREE_SECTORS)[number];

export type ProjectTreeNodeKind =
  | "project"
  | "sector"
  | "entity"
  | "relation"
  | "operation"
  | "task"
  | "draft"
  | "inbox"
  | "commit";

export type ProjectTreeNode = {
  readonly id: string;
  readonly kind: ProjectTreeNodeKind;
  readonly sector: ProjectTreeSector | null;
  readonly labelKo: string;
  readonly emoji: string;
  readonly children: readonly ProjectTreeNode[];
  /** Same id appears under Globe Projection when spatial. */
  readonly globeProjectable: boolean;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly relationKind: string | null;
  readonly relatedNodeId: string | null;
};

export type RealityExplorerBranch = {
  readonly root: RealityExplorerRoot;
  readonly labelKo: string;
  readonly emoji: string;
  readonly children: readonly ProjectTreeNode[];
};

/** Dual view — Ontology tree + Globe pins share node ids. */
export type ProjectDualView = {
  readonly ontologyRoot: ProjectTreeNode;
  readonly globeRoot: ProjectTreeNode;
  /** Edges used by Execution Graph ordering. */
  readonly relations: readonly {
    readonly id: string;
    readonly kind: string;
    readonly fromNodeId: string;
    readonly toNodeId: string;
    readonly labelKo: string;
  }[];
};

/** Cursor-style "I'll prepare" plan before Projection. */
export type RealityPreparePlanStep = {
  readonly id: string;
  readonly labelKo: string;
  readonly done: boolean;
};

export type RealityPreparePlan = {
  readonly version: 1;
  readonly introKo: string;
  readonly steps: readonly RealityPreparePlanStep[];
  readonly projectingKo: string;
};

export type RealityExplorerSnapshot = {
  readonly version: typeof REALITY_EXPLORER_VERSION;
  readonly projectId: string;
  readonly projectTitleKo: string;
  readonly utterance: string;
  readonly tree: ProjectTreeNode;
  readonly dual: ProjectDualView;
  readonly branches: readonly RealityExplorerBranch[];
  readonly preparePlan: RealityPreparePlan;
};
