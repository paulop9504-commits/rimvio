/**
 * Dynamic Callout — Reality Object Control Surface (STEP 8).
 *
 * Not a fixed info card. UI Schema is generated from:
 * Object + Context + Intent + Agent State
 *
 * States: Discover · Analyze · Compare · Simulate · Prepare · Commit
 * Callout never Reality-Commits — Commit state = Field handoff schema only.
 */

export const DYNAMIC_CALLOUT_STATES = [
  "Discover",
  "Analyze",
  "Compare",
  "Simulate",
  "Prepare",
  "Commit",
] as const;

export type DynamicCalloutState = (typeof DYNAMIC_CALLOUT_STATES)[number];

/** Schema block kinds — renderer maps these; no hardcoded hotel layout. */
export const CALLOUT_UI_BLOCK_KINDS = [
  "header",
  "evidence",
  "why",
  "metric",
  "impact",
  "price_delta",
  "distance_delta",
  "simulation",
  "prepare",
  "commit_handoff",
  "action_row",
  "note",
] as const;

export type CalloutUiBlockKind = (typeof CALLOUT_UI_BLOCK_KINDS)[number];

export type CalloutUiBlock = {
  readonly id: string;
  readonly kind: CalloutUiBlockKind;
  readonly labelKo: string;
  readonly bodyKo: string | null;
  readonly valueKo: string | null;
  readonly primary: boolean;
  readonly meta: Readonly<Record<string, unknown>>;
};

export type CalloutUiAction = {
  readonly id: string;
  readonly labelKo: string;
  readonly enabled: boolean;
  readonly primary: boolean;
  /** Semantic verb for host — never "commit" inside Callout except handoff */
  readonly verb:
    | "show_evidence"
    | "analyze"
    | "compare"
    | "simulate"
    | "prepare"
    | "handoff_field"
    | "dismiss";
};

/**
 * Dynamic UI Schema — the only product contract for Callout rendering.
 * `fixedUi: false` is locked.
 */
export type DynamicCalloutSchema = {
  readonly state: DynamicCalloutState;
  readonly objectId: string;
  readonly objectTitle: string;
  readonly contextId: string;
  readonly blocks: readonly CalloutUiBlock[];
  readonly actions: readonly CalloutUiAction[];
  /** Changes when Object/Context/Intent/Agent change — same hotel, different UI */
  readonly fingerprint: string;
  readonly fixedUi: false;
  readonly commitForbiddenInCallout: true;
  readonly summaryKo: string;
};

export type DynamicCalloutObject = {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly priceLabelKo: string | null;
  readonly priceWon: number | null;
  readonly whyLinesKo: readonly string[];
  readonly evidence: readonly {
    readonly id: string;
    readonly title: string;
    readonly value: string;
    readonly present: boolean;
  }[];
  readonly canPrepare: boolean;
};

export type DynamicCalloutContext = {
  readonly contextId: string;
  readonly titleKo: string;
  readonly purposeKo: string | null;
  /** e.g. trip day / region */
  readonly situationKo: string | null;
};

export type DynamicCalloutIntent = {
  readonly action: string;
  readonly target: string;
  readonly rawText: string | null;
};

export type DynamicCalloutAgentState = {
  readonly phase: string | null;
  readonly problemKo: string | null;
  readonly recommendationKo: string | null;
  readonly draftId: string | null;
  readonly alternativesKo: readonly string[];
};

export type DynamicCalloutCompare = {
  readonly alternativeTitle: string | null;
  readonly priceDeltaWon: number | null;
  readonly priceDeltaKo: string | null;
  readonly distanceDeltaMeters: number | null;
  readonly distanceDeltaKo: string | null;
  readonly impactSummaryKo: string | null;
};

export type DynamicCalloutInput = {
  readonly object: DynamicCalloutObject;
  readonly context: DynamicCalloutContext;
  readonly intent: DynamicCalloutIntent | null;
  readonly agent: DynamicCalloutAgentState | null;
  readonly compare?: DynamicCalloutCompare | null;
  /** Force a state (tests / host). Otherwise resolved from inputs. */
  readonly forceState?: DynamicCalloutState | null;
};
