/**
 * Context Compiler IR — Reality Parser output (ADR-023).
 * Not a chat essay. Feeds Workspace / Graph / Capsule.
 */

export const CONTEXT_COMPILER_IR_VERSION = 1 as const;

export type CompilerEntityType =
  | "location"
  | "place"
  | "person"
  | "activity"
  | "brand"
  | "food"
  | "unknown";

export type CompilerEntity = {
  readonly type: CompilerEntityType;
  readonly value: string;
  readonly relation?: string | null;
  readonly confidence: number;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly sourceId?: string | null;
};

export type CompilerTimeContext = {
  readonly dateIso: string | null;
  readonly endDateIso: string | null;
  readonly period: "morning" | "afternoon" | "evening" | "night" | "weekend" | "today" | null;
  readonly durationDays: number | null;
  readonly participants: string | null;
};

export type CompilerPreferenceVector = {
  readonly food: number;
  readonly nature: number;
  readonly luxury: number;
  readonly crowdAvoidance: number;
  readonly romantic: number;
  readonly budgetSensitive: number;
};

export type CompilerIntentGraph = {
  readonly family: string;
  readonly goalKo: string | null;
  readonly hiddenKo: readonly string[];
  readonly emotion: Readonly<Record<string, number>>;
};

export type CompilerConstraintBag = {
  readonly budget: string | number | null;
  readonly maxWalkMinutes: number | null;
  readonly maxPriceKrw: number | null;
  readonly companion: string | null;
};

export type CompilerGraphEdgeKind =
  | "nearby"
  | "compare"
  | "route"
  | "bookable"
  | "anchor";

export type CompilerGraphNode = {
  readonly id: string;
  readonly type: string;
  readonly labelKo: string;
  readonly lat: number | null;
  readonly lng: number | null;
};

export type CompilerGraphEdge = {
  readonly id: string;
  readonly kind: CompilerGraphEdgeKind;
  readonly fromId: string;
  readonly toId: string;
  readonly labelKo: string;
  readonly meters: number | null;
};

export type CompilerRealityState = {
  readonly asOfIso: string;
  readonly weather: string | null;
  readonly inventoryHints: readonly string[];
};

export type CompilerActionId =
  | "search_place"
  | "generate_route"
  | "check_reservation"
  | "compare_place"
  | "filter_place"
  | "open_workspace"
  | "commit_reality";

/** Context Compiler output — attach to ContextPack as `compilerIr`. */
export type ContextCompilerIrV1 = {
  readonly version: typeof CONTEXT_COMPILER_IR_VERSION;
  readonly contextLabelKo: string | null;
  readonly intent: CompilerIntentGraph;
  readonly entities: readonly CompilerEntity[];
  readonly time: CompilerTimeContext;
  readonly preference: CompilerPreferenceVector;
  readonly constraints: CompilerConstraintBag;
  readonly actions: readonly CompilerActionId[];
  readonly graph: {
    readonly nodes: readonly CompilerGraphNode[];
    readonly edges: readonly CompilerGraphEdge[];
  };
  readonly reality: CompilerRealityState;
  readonly compiledAtIso: string;
};
