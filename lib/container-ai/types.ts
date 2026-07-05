/**
 * Container AI — internal orchestrator module ids.
 * User sees one surface (Trip Assistant / Journey AI); dev SSOT uses these modules.
 * @see docs/RIMVIO_CONTAINER_AI.md
 */

export const CONTAINER_AI_MODULES = [
  "travel_brain",
  "execution_graph_reader",
  "context_condition_ai",
  "domain_ai_router",
  "ghost_pin_generator",
  "action_composer",
] as const;

export type ContainerAIModule = (typeof CONTAINER_AI_MODULES)[number];

/** User-facing product names — L1 story layer only, not code symbols. */
export const CONTAINER_AI_USER_LABELS = {
  travel: "Trip Assistant",
  trade: "Trade Assistant",
  medical: "Care Assistant",
  work: "Work Assistant",
  finance: "Context Assistant",
  education: "Context Assistant",
  smart_home: "Context Assistant",
  generic: "Context Assistant",
} as const;

export type ContainerAIUserLabelKey = keyof typeof CONTAINER_AI_USER_LABELS;

export type ContainerAICapabilityOffer = {
  readonly kind: string;
  readonly label: string;
  readonly resourceKind: string;
  readonly executor: string | null;
};

export type ContainerAINodeSummary = {
  readonly nodeId: string;
  readonly kind: string;
  readonly label: string;
  readonly status: string;
  readonly resolution: string;
  readonly spatialLabel: string | null;
};

/**
 * What Container AI reads before every user turn.
 * Always derived from Blueprint + active execution node — never free-form guess.
 */
export type OperatorContext = {
  readonly contextId: string;
  readonly bridgeId: string;
  readonly runtimeId: string;
  /** @deprecated use contextId */
  readonly containerEventId: string;
  readonly goal: string;
  readonly activeNode: ContainerAINodeSummary;
  readonly destinationLabel: string | null;
  readonly destinationResolution: string | null;
  readonly availableCapabilities: readonly ContainerAICapabilityOffer[];
  readonly blockedNodeIds: readonly string[];
};

/** @deprecated v1 — use OperatorContext */
export type ContainerAIContext = OperatorContext;

export type ContainerAIGateOutcome =
  | {
      readonly allowed: true;
      readonly routeModule: ContainerAIModule;
      readonly domainExecutor: string | null;
    }
  | {
      readonly allowed: false;
      readonly reasonKo: string;
      readonly suggestedNodeKind: string | null;
      readonly destinationChoices: readonly { id: string; label: string }[];
      readonly quickActions: readonly { id: string; label: string }[];
    };
