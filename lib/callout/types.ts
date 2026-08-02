/**
 * Rimvio Object Callout — Agent Control Surface on a Reality Entity.
 * Not an info card: Observe → Explore → Simulate → Prepare → Commit (Field).
 * @see docs/adr/022-context-workspace-first.md (Article 0: Commit ≠ auto-pay)
 */

export const RIMVIO_OBJECT_TYPES = [
  "hotel",
  "restaurant",
  "place",
  "event",
  "product",
] as const;

export type RimvioObjectType = (typeof RIMVIO_OBJECT_TYPES)[number];

export const RIMVIO_OBJECT_STATES = [
  "discovered",
  "candidate",
  "shortlisted",
  "prepared",
  "committed",
] as const;

export type RimvioObjectState = (typeof RIMVIO_OBJECT_STATES)[number];

export const CALLOUT_MODES = [
  "observe",
  "explore",
  "simulate",
  "prepare",
  "commit",
] as const;

export type CalloutMode = (typeof CALLOUT_MODES)[number];

export type CalloutEvidenceLayer =
  | "price"
  | "distance"
  | "preference"
  | "availability"
  | "review"
  | "schedule"
  | "relation";

export type CalloutEvidence = {
  readonly id: string;
  readonly layer: CalloutEvidenceLayer;
  readonly labelKo: string;
  readonly detailKo: string | null;
  readonly present: boolean;
};

export type CalloutActionKind =
  | "select"
  | "compare"
  | "bookmark"
  | "focus_related"
  | "change_intent"
  | "apply_simulation"
  | "create_prepare_draft"
  | "handoff_field"
  | "connect";

export type CalloutAction = {
  readonly id: string;
  readonly kind: CalloutActionKind;
  readonly labelKo: string;
  readonly enabled: boolean;
  /** Target object / relation when applicable */
  readonly targetId?: string | null;
};

export type RimvioObjectLocation = {
  readonly lat: number;
  readonly lng: number;
};

export type RimvioObject = {
  readonly id: string;
  readonly type: RimvioObjectType;
  readonly title: string;
  readonly location: RimvioObjectLocation;
  readonly contextId: string;
  readonly state: RimvioObjectState;
  readonly evidence: readonly CalloutEvidence[];
  readonly actions: readonly CalloutAction[];
  /** Grounded facts for Simulate / Prepare — never invent */
  readonly facts: {
    readonly priceLabelKo: string | null;
    readonly rating: number | null;
    readonly reviewSummaryKo: string | null;
    readonly whyLinesKo: readonly string[];
    readonly canPrepare: boolean;
    readonly selected: boolean;
    readonly bookmarked: boolean;
    readonly inCompare: boolean;
  };
};

/** Ontology edge from this object — Explore expands Context, not "nearby dump". */
export type CalloutExploreEdge = {
  readonly id: string;
  readonly relationId: string;
  readonly labelKo: string;
  readonly targetObjectId: string | null;
  readonly hintKo: string | null;
  readonly count: number | null;
};

/** What-if delta vs an alternative object — Simulate mode. */
export type CalloutSimulationDelta = {
  readonly id: string;
  readonly alternativeObjectId: string;
  readonly alternativeTitle: string;
  readonly linesKo: readonly string[];
  readonly budgetDeltaKo: string | null;
  readonly routeDeltaKo: string | null;
};

export type CalloutPrepareStep = {
  readonly id: string;
  readonly labelKo: string;
  readonly done: boolean;
};

/** Change Intent axes — Context is the protagonist, not "ask AI". */
export type CalloutIntentAxis = {
  readonly id: string;
  readonly labelKo: string;
  /** Preferred nudge direction for UI */
  readonly nudge: "up" | "down" | "neutral";
};

export type CalloutConnectTarget = {
  readonly id: string;
  readonly type: RimvioObjectType | "schedule" | "budget" | "flight";
  readonly labelKo: string;
};

export type CalloutViewModel = {
  readonly object: RimvioObject;
  readonly typeLabelKo: string;
  readonly stateLabelKo: string;
  readonly lifecycle: readonly {
    readonly state: RimvioObjectState;
    readonly labelKo: string;
    readonly reached: boolean;
  }[];
  readonly modes: readonly CalloutMode[];
  readonly observe: {
    readonly whyLinesKo: readonly string[];
    readonly evidence: readonly CalloutEvidence[];
  };
  readonly explore: {
    readonly edges: readonly CalloutExploreEdge[];
  };
  readonly simulate: {
    readonly currentTitle: string;
    readonly deltas: readonly CalloutSimulationDelta[];
    readonly emptyKo: string;
  };
  readonly prepare: {
    readonly steps: readonly CalloutPrepareStep[];
    readonly ctaKo: string;
    readonly canCreateDraft: boolean;
  };
  readonly commit: {
    readonly summaryKo: string;
    readonly ctaKo: string;
    readonly enabled: boolean;
  };
  readonly intentAxes: readonly CalloutIntentAxis[];
  readonly connectTargets: readonly CalloutConnectTarget[];
  readonly askPlaceholderKo: string;
};

export type CalloutHandlers = {
  onSelect?: (objectId: string) => void;
  onCompare?: (objectId: string) => void;
  onBookmark?: (objectId: string) => void;
  onFocusRelated?: (objectId: string) => void;
  onChangeIntent?: (
    objectId: string,
    axes: readonly { id: string; nudge: "up" | "down" | "neutral" }[],
  ) => void;
  onApplySimulation?: (objectId: string, alternativeObjectId: string) => void;
  onCreatePrepareDraft?: (objectId: string) => void;
  onHandoffField?: (objectId: string) => void;
  onConnect?: (objectId: string, targetId: string) => void;
  onAskObject?: (objectId: string, text: string) => void;
};

/** Registry descriptor — new Object types extend here; Callout Core stays closed. */
export type CalloutObjectTypeDescriptor = {
  readonly type: RimvioObjectType;
  readonly labelKo: string;
  readonly modes: readonly CalloutMode[];
  readonly intentAxes: readonly CalloutIntentAxis[];
  readonly exploreRelations: readonly {
    readonly id: string;
    readonly labelKo: string;
    /** Maps to workspace edge / neighbor kinds when present */
    readonly matchKinds: readonly string[];
  }[];
  readonly prepareStepDefs: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly isDone: (object: RimvioObject) => boolean;
  }[];
  readonly connectTargets: readonly CalloutConnectTarget[];
  readonly askPlaceholderKo: string;
  readonly prepareCtaKo: string;
  readonly commitCtaKo: string;
  readonly simulateEmptyKo: string;
};
