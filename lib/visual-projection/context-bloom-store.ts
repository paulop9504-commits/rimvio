import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import { resolveBloomRelatedForSelect } from "@/lib/reality-object/persist-bloom-relations";
import type {
  ContextBloomCandidate,
  ContextBloomMarkerDecor,
  ContextBloomRelatedHit,
} from "@/lib/visual-projection/context-bloom-types";
import { projectContextBloomArcs } from "@/lib/visual-projection/project-context-bloom-arcs";

/** Bloom sequence — Execution CTAs appear only at execution_ready. */
export type ContextBloomPhase =
  | "idle"
  | "glowing"
  | "arcs"
  | "related_bloom"
  | "execution_ready";

export type ContextBloomSessionLive = {
  readonly selected: ContextBloomCandidate;
  readonly related: readonly ContextBloomRelatedHit[];
  readonly arcs: readonly GlobeTripArc[];
  readonly startedAtMs: number;
  readonly arcsUntilMs: number;
  readonly phase: ContextBloomPhase;
};

const ARC_VISIBLE_MS = 450;
const GLOW_MS = 120;
const RELATED_BLOOM_MS = 420;
const PHASE_GAP_MS = 80;

const listeners = new Set<() => void>();
let session: ContextBloomSessionLive | null = null;
const timers: ReturnType<typeof setTimeout>[] = [];

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function clearTimers(): void {
  for (const timer of timers) {
    clearTimeout(timer);
  }
  timers.length = 0;
}

function schedule(ms: number, fn: () => void): void {
  timers.push(setTimeout(fn, ms));
}

function setPhase(phase: ContextBloomPhase): void {
  if (!session) {
    return;
  }
  session = { ...session, phase };
  emit();
}

export function subscribeContextBloom(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readContextBloomSession(): ContextBloomSessionLive | null {
  return session;
}

export function isContextBloomExecutionReady(): boolean {
  return session?.phase === "execution_ready";
}

export function clearContextBloom(): void {
  clearTimers();
  if (!session) {
    return;
  }
  session = null;
  emit();
}

/**
 * Start Context Bloom on object select.
 * Sequence: glowing → arcs → related_bloom → execution_ready.
 * Arcs clear after ARC_VISIBLE_MS; glow stays until clear/next.
 */
export function startContextBloom(input: {
  selected: ContextBloomCandidate;
  candidates: readonly ContextBloomCandidate[];
  maxRelated?: number;
  nowMs?: number;
  /** Persisted bloom edges hydrated against current candidates. */
  preferredRelated?: readonly ContextBloomRelatedHit[] | null;
}): ContextBloomSessionLive {
  clearTimers();
  const nowMs = input.nowMs ?? Date.now();
  const related = resolveBloomRelatedForSelect({
    selected: input.selected,
    candidates: input.candidates,
    preferredRelated: input.preferredRelated,
    maxRelated: input.maxRelated,
  });
  const arcs = projectContextBloomArcs({
    selected: input.selected,
    related,
  });
  const lastBloomDelay =
    related.length > 0 ? related[related.length - 1]!.bloomDelayMs : 0;

  session = {
    selected: input.selected,
    related,
    arcs,
    startedAtMs: nowMs,
    arcsUntilMs: nowMs + ARC_VISIBLE_MS,
    phase: "glowing",
  };
  emit();

  if (typeof window !== "undefined") {
    schedule(GLOW_MS, () => {
      setPhase("arcs");
    });

    schedule(ARC_VISIBLE_MS, () => {
      if (!session) {
        return;
      }
      session = {
        ...session,
        arcs: [],
        phase:
          session.phase === "glowing" || session.phase === "arcs"
            ? "related_bloom"
            : session.phase,
      };
      emit();
    });

    schedule(GLOW_MS + PHASE_GAP_MS, () => {
      if (!session) {
        return;
      }
      if (session.phase === "glowing" || session.phase === "arcs") {
        setPhase("related_bloom");
      }
    });

    const executionAt =
      GLOW_MS + PHASE_GAP_MS + lastBloomDelay + RELATED_BLOOM_MS + PHASE_GAP_MS;
    schedule(executionAt, () => {
      setPhase("execution_ready");
    });
  } else {
    session = { ...session, phase: "execution_ready" };
  }

  return session;
}

export function resolveContextBloomDecor(
  markerId: string,
  resourceId?: string | null,
): ContextBloomMarkerDecor {
  if (!session) {
    return { bloomRole: "none", bloomDelayMs: 0 };
  }
  if (
    session.selected.id === markerId ||
    session.selected.resourceId === resourceId
  ) {
    return { bloomRole: "selected", bloomDelayMs: 0 };
  }
  const hit = session.related.find(
    (row) => row.id === markerId || row.resourceId === resourceId,
  );
  if (hit) {
    return {
      bloomRole: "related",
      bloomDelayMs: hit.bloomDelayMs,
      bloomRelationKind: hit.relationKind,
    };
  }
  return { bloomRole: "none", bloomDelayMs: 0 };
}

export function readContextBloomArcsVisible(nowMs = Date.now()) {
  if (!session) {
    return [];
  }
  if (nowMs > session.arcsUntilMs) {
    return [];
  }
  return session.arcs;
}

export const CONTEXT_BLOOM_ARC_VISIBLE_MS = ARC_VISIBLE_MS;
