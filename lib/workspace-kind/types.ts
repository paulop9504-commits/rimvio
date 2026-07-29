/**
 * Workspace Kind — intent → prepared resource workspace (not search results).
 * Domains are Context types on one OS — not separate apps (ADR-032).
 * Law: One Intent → One Workspace → One Focus (ADR-025).
 * @see docs/adr/024-workspace-kind-prep.md · docs/adr/025-one-intent-workspace-focus.md
 * @see docs/adr/032-marketplace-as-context-type.md
 */

export const WORKSPACE_KINDS = ["travel", "driver", "used_goods"] as const;

export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];

/** Who fills the slot — LLM never invents slot schema. */
export type WorkspaceSlotFiller = "tool" | "sensor" | "user" | "stub";

export type WorkspaceSlotDef = {
  readonly id: string;
  readonly labelKo: string;
  readonly filler: WorkspaceSlotFiller;
  readonly required: boolean;
};

export type WorkspaceKindTemplate = {
  readonly kind: WorkspaceKind;
  readonly titleKo: string;
  readonly eyebrowKo: string;
  /** Fixed slot rail — product surface, not freeform chat. */
  readonly slots: readonly WorkspaceSlotDef[];
  /**
   * Ordered Focus steps (slot ids). Screen shows ONE at a time.
   * Other slots appear only as ghost one-liners.
   */
  readonly focusSequence: readonly string[];
  /** Tool Registry ids this kind may auto-attach. */
  readonly toolPack: readonly string[];
};

export type WorkspaceFocusGhostStatus = "done" | "waiting" | "background";

export type WorkspaceFocusGhostRow = {
  readonly slotId: string;
  readonly labelKo: string;
  readonly status: WorkspaceFocusGhostStatus;
  readonly lineKo: string;
};

/**
 * Primary Focus surface — the only large UI inside an open Workspace.
 */
export type WorkspaceFocusSurface = {
  readonly version: 1;
  readonly kind: WorkspaceKind;
  readonly focusSlotId: string;
  readonly focusIndex: number;
  readonly focusTotal: number;
  readonly focusLabelKo: string;
  readonly headlineKo: string;
  readonly askKo: string;
  readonly ghostRows: readonly WorkspaceFocusGhostRow[];
};

/**
 * Prep card — resources ready, one CTA opens the workspace.
 * Chat essay is not the answer; this card is.
 */
export type WorkspacePrepCardModel = {
  readonly version: 1;
  readonly kind: WorkspaceKind;
  readonly titleKo: string;
  readonly eyebrowKo: string;
  readonly bodyKo: string;
  readonly ctaKo: string;
  readonly slotLabelsKo: readonly string[];
  readonly preparedSlotCount: number;
  readonly totalSlotCount: number;
  readonly contextEventId: string | null;
  readonly utterance: string;
  /** Open wire hint for UI hosts. */
  readonly openHint:
    | "travel_workspace"
    | "driver_workspace_shell"
    | "used_goods_workspace_shell";
  /** First Focus after open — never “show everything”. */
  readonly focusHintKo: string;
  readonly focusSlotId: string;
};
