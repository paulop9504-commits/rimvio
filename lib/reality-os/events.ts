/**
 * Reality OS events — cross-layer notification vocabulary.
 * Does not replace existing CustomEvent names; documents + unifies them.
 */

import type { RealityOsLayerId } from "@/lib/reality-os/constitution";

export const REALITY_OS_EVENT_NAMES = [
  "rimvio:reality-os:context-opened",
  "rimvio:reality-os:workspace-opened",
  "rimvio:reality-os:graph-updated",
  "rimvio:reality-os:agent-proposed",
  "rimvio:reality-os:draft-created",
  "rimvio:reality-os:draft-applied",
  "rimvio:reality-os:simulation-ran",
  "rimvio:reality-os:prepare-ready",
  "rimvio:reality-os:commit-requested",
  "rimvio:reality-os:commit-recorded",
  "rimvio:reality-os:constitution-violation",
] as const;

export type RealityOsEventName = (typeof REALITY_OS_EVENT_NAMES)[number];

/** Map existing module events → Reality OS event family (additive alias). */
export const REALITY_OS_EVENT_ALIASES = {
  "rimvio:workspace-draft-created": "rimvio:reality-os:draft-created",
  "rimvio:workspace-draft-applied": "rimvio:reality-os:draft-applied",
  "rimvio:reality-simulation-updated": "rimvio:reality-os:simulation-ran",
  "rimvio:reality-prepare-updated": "rimvio:reality-os:prepare-ready",
  "rimvio:reality-commit-ledger-updated": "rimvio:reality-os:commit-recorded",
} as const;

export type RealityOsEventBase = {
  readonly name: RealityOsEventName;
  readonly contextId: string | null;
  readonly workspaceId: string | null;
  readonly layer: RealityOsLayerId;
  readonly atIso: string;
};

export type RealityOsContextOpenedEvent = RealityOsEventBase & {
  readonly name: "rimvio:reality-os:context-opened";
  readonly layer: "context";
  readonly blueprintId: string | null;
};

export type RealityOsWorkspaceOpenedEvent = RealityOsEventBase & {
  readonly name: "rimvio:reality-os:workspace-opened";
  readonly layer: "workspace";
};

export type RealityOsDraftEvent = RealityOsEventBase & {
  readonly name:
    | "rimvio:reality-os:draft-created"
    | "rimvio:reality-os:draft-applied";
  readonly layer: "draft";
  readonly draftId: string;
};

export type RealityOsSimulationEvent = RealityOsEventBase & {
  readonly name: "rimvio:reality-os:simulation-ran";
  readonly layer: "simulation";
  readonly simulationId: string;
  readonly status: "SIMULATION_ONLY";
};

export type RealityOsPrepareEvent = RealityOsEventBase & {
  readonly name: "rimvio:reality-os:prepare-ready";
  readonly layer: "prepare";
  readonly prepareId: string;
  readonly status: "ready_for_commit";
};

export type RealityOsCommitEvent = RealityOsEventBase & {
  readonly name:
    | "rimvio:reality-os:commit-requested"
    | "rimvio:reality-os:commit-recorded";
  readonly layer: "commit";
  readonly actor: "user" | "ai_rejected";
  readonly transactionId: string | null;
  readonly ledgerEntryId: string | null;
};

export type RealityOsConstitutionViolationEvent = RealityOsEventBase & {
  readonly name: "rimvio:reality-os:constitution-violation";
  readonly principle: string;
  readonly detailKo: string;
};

export type RealityOsEvent =
  | RealityOsContextOpenedEvent
  | RealityOsWorkspaceOpenedEvent
  | RealityOsDraftEvent
  | RealityOsSimulationEvent
  | RealityOsPrepareEvent
  | RealityOsCommitEvent
  | RealityOsConstitutionViolationEvent
  | RealityOsEventBase;

const listeners = new Set<(event: RealityOsEvent) => void>();

export function subscribeRealityOsEvents(
  listener: (event: RealityOsEvent) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitRealityOsEvent(event: RealityOsEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // never break emitters
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(event.name, {
        detail: event,
      }),
    );
  }
}

export function clearRealityOsEventListenersForTests(): void {
  listeners.clear();
}

export function makeRealityOsEventBase(input: {
  readonly name: RealityOsEventName;
  readonly layer: RealityOsLayerId;
  readonly contextId?: string | null;
  readonly workspaceId?: string | null;
}): RealityOsEventBase {
  return {
    name: input.name,
    layer: input.layer,
    contextId: input.contextId ?? null,
    workspaceId: input.workspaceId ?? null,
    atIso: new Date().toISOString(),
  };
}
