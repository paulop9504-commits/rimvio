/**
 * Globe Ingress — Intent → Context → Bridge → Runtime → Blueprint
 * Single unidirectional compiler (Globe OS kernel scheduler).
 * @see docs/RIMVIO_GLOBE_INGRESS.md
 */

export type GlobeIngressIntent = {
  readonly text: string;
  readonly existingContextId?: string | null;
};

export type GlobeIngressContextSlot = {
  readonly key: string;
  readonly value: string;
  readonly resolution: "confirmed" | "hypothesis" | "unresolved";
};

/** Step 1 — meaning unit draft (Context SSOT row created at dispatch Commit boundary). */
export type GlobeIngressContextDraft = {
  readonly contextId: string;
  readonly goal: string;
  readonly runtimeKind: import("@/lib/context-blueprint/blueprint-constants").ContextContainerKind;
  readonly slots: readonly GlobeIngressContextSlot[];
};

/** Step 2 — memory graph path linking Contexts (Bridge). */
export type GlobeIngressBridgeDraft = {
  readonly bridgeId: string;
  readonly pathLabels: readonly string[];
  readonly linkedContextIds: readonly string[];
};

export type GlobeIngressCompileResult = {
  readonly intent: string;
  readonly context: GlobeIngressContextDraft;
  readonly bridge: GlobeIngressBridgeDraft;
  readonly runtime: import("@/lib/runtime/types").RimvioRuntime;
  readonly blueprint: import("@/lib/context-blueprint/types").ContextBlueprint;
};

export const GLOBE_INGRESS_FORBIDDEN_REENTRY = [
  "blueprint_to_runtime",
  "bridge_to_intent",
  "context_to_runtime_skip",
] as const;

export type GlobeIngressForbiddenReentry =
  (typeof GLOBE_INGRESS_FORBIDDEN_REENTRY)[number];
