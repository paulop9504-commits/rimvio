/** Context-bound agent runtime — idle/busy lifecycle + Cursor-style process phases. */

export type ContextAgentLifecycle = "idle" | "busy";

export type ContextAgentProcessPhase = "exploring" | "analyzing" | "optimizing";

export type ContextAgentRuntimeState = {
  readonly lifecycle: ContextAgentLifecycle;
  readonly processPhase: ContextAgentProcessPhase | null;
  /** Optional L1 status line — auto-run / intake / scout-retry progress. */
  readonly statusHintKo: string | null;
};

export type ContextAgentRuntimeDetail = ContextAgentRuntimeState;

const GLOBE_CONTEXT_AGENT_RUNTIME_EVENT = "rimvio-globe-context-agent-runtime";

let runtime: ContextAgentRuntimeState = {
  lifecycle: "idle",
  processPhase: null,
  statusHintKo: null,
};

function emit(next: ContextAgentRuntimeState): void {
  runtime = next;
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextAgentRuntimeDetail>(GLOBE_CONTEXT_AGENT_RUNTIME_EVENT, {
      detail: next,
    }),
  );
}

export function readContextAgentRuntimeState(): ContextAgentRuntimeState {
  return runtime;
}

export function isContextAgentBusy(): boolean {
  return runtime.lifecycle === "busy";
}

export function beginContextAgentWork(
  processPhase: ContextAgentProcessPhase = "exploring",
  statusHintKo?: string | null,
): void {
  emit({
    lifecycle: "busy",
    processPhase,
    statusHintKo: statusHintKo?.trim() || null,
  });
}

export function setContextAgentProcessPhase(
  processPhase: ContextAgentProcessPhase,
  statusHintKo?: string | null,
): void {
  emit({
    lifecycle: "busy",
    processPhase,
    statusHintKo:
      statusHintKo !== undefined
        ? statusHintKo?.trim() || null
        : runtime.statusHintKo,
  });
}

export function setContextAgentStatusHint(statusHintKo: string | null): void {
  emit({
    ...runtime,
    lifecycle: runtime.lifecycle === "idle" ? "busy" : runtime.lifecycle,
    processPhase: runtime.processPhase ?? "analyzing",
    statusHintKo: statusHintKo?.trim() || null,
  });
}

export function finishContextAgentWork(): void {
  emit({ lifecycle: "idle", processPhase: null, statusHintKo: null });
}

export function resetContextAgentRuntime(): void {
  finishContextAgentWork();
}

export function subscribeContextAgentRuntime(
  listener: (detail: ContextAgentRuntimeDetail) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<ContextAgentRuntimeDetail>).detail);
  };
  window.addEventListener(GLOBE_CONTEXT_AGENT_RUNTIME_EVENT, handler);
  return () =>
    window.removeEventListener(GLOBE_CONTEXT_AGENT_RUNTIME_EVENT, handler);
}
