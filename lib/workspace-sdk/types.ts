/**
 * Workspace SDK — every Workspace is the same six regions.
 * Domains differ in content; skeleton never changes.
 * Morphology (map · pipeline · grid…) plugs Node flesh — never user-picked (ADR-033).
 * @see docs/adr/026-workspace-sdk-six-regions.md
 * @see docs/adr/033-context-type-workspace-morphology.md
 */

import type { WorkspaceMorphologyId } from "@/lib/workspace-morphology";

export const WORKSPACE_SDK_VERSION = 1 as const;

/** Locked region order — UI hosts must render all six (ghost OK, omit ❌). */
export const WORKSPACE_SDK_REGIONS = [
  "header",
  "ai",
  "primary_focus",
  "node",
  "action",
  "commit",
] as const;

export type WorkspaceSdkRegionId = (typeof WORKSPACE_SDK_REGIONS)[number];

/** Platform kinds that plug into the SDK (extensible). */
export const WORKSPACE_SDK_KINDS = [
  "travel",
  "driver",
  "used_goods",
] as const;

export type WorkspaceSdkKind = (typeof WORKSPACE_SDK_KINDS)[number];

export type WorkspaceSdkLifecycle =
  | "prepared"
  | "focused"
  | "action_ready"
  | "awaiting_commit"
  | "committed";

export type WorkspaceSdkHeader = {
  readonly titleKo: string;
  readonly subtitleKo: string | null;
  readonly eyebrowKo: string;
};

export type WorkspaceSdkAi = {
  readonly roleLabelKo: string;
  readonly promptPlaceholderKo: string;
  /** Short strip line under Focus — not a chat essay. */
  readonly stripHintKo: string | null;
};

export type WorkspaceSdkPrimaryFocus = {
  readonly slotId: string;
  readonly labelKo: string;
  readonly headlineKo: string;
  readonly askKo: string;
};

/**
 * What the user looks at inside Focus.
 * Extended surfaces map from morphology; hosts may fall back to cards/map/shell.
 */
export type WorkspaceSdkNodeSurface =
  | "cards"
  | "list"
  | "map"
  | "thread"
  | "shell"
  | "grid"
  | "pipeline"
  | "timeline"
  | "dashboard"
  | "canvas"
  | "graph"
  | "calendar"
  | "ledger";

export type WorkspaceSdkNode = {
  readonly surface: WorkspaceSdkNodeSurface;
  readonly labelKo: string;
};

export type WorkspaceSdkAction = {
  readonly id: string;
  readonly labelKo: string;
  /** Tool Registry id when applicable. */
  readonly toolId: string | null;
};

export type WorkspaceSdkCommit = {
  readonly labelKo: string;
  /** Article 0 — always human. */
  readonly requiresHuman: true;
  /** Maps to Field / Hub payment when true. */
  readonly leadsToPayment: boolean;
};

/**
 * Canonical Workspace frame — 100 platforms share this shape.
 */
export type WorkspaceSdkFrame = {
  readonly version: typeof WORKSPACE_SDK_VERSION;
  readonly kind: WorkspaceSdkKind;
  /** Auto morphology — never a user setting (ADR-033). */
  readonly morphologyId: WorkspaceMorphologyId;
  readonly lifecycle: WorkspaceSdkLifecycle;
  readonly contextEventId: string | null;
  readonly header: WorkspaceSdkHeader;
  readonly ai: WorkspaceSdkAi;
  readonly primaryFocus: WorkspaceSdkPrimaryFocus;
  readonly node: WorkspaceSdkNode;
  readonly action: WorkspaceSdkAction;
  readonly commit: WorkspaceSdkCommit;
  /**
   * Progressive Reality OS strip (ADR-034) — projection hint, not SSOT.
   * Omitted on legacy frames until Continuum seeds a bundle.
   */
  readonly progressiveHintKo?: string | null;
  readonly activePrimitiveIds?: readonly string[] | null;
};

/** Static recipe per kind — content plugs in; regions stay fixed. */
export type WorkspaceSdkKindRecipe = {
  readonly kind: WorkspaceSdkKind;
  readonly morphologyId: WorkspaceMorphologyId;
  readonly defaultHeaderTitleKo: string;
  readonly aiRoleLabelKo: string;
  readonly aiPromptPlaceholderKo: string;
  readonly focusSlotId: string;
  readonly focusLabelKo: string;
  readonly node: WorkspaceSdkNode;
  readonly action: WorkspaceSdkAction;
  readonly commit: Omit<WorkspaceSdkCommit, "requiresHuman"> & {
    readonly requiresHuman: true;
  };
};
