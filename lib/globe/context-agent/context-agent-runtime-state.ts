/** Context-bound agent runtime — idle/busy lifecycle + Cursor-style process phases. */

export type ContextAgentLifecycle = "idle" | "busy";

export type ContextAgentProcessPhase = "exploring" | "analyzing" | "optimizing";

export type ContextAgentRuntimeState = {
  readonly lifecycle: ContextAgentLifecycle;
  readonly processPhase: ContextAgentProcessPhase | null;
};

export type ContextAgentRuntimeDetail = ContextAgentRuntimeState;

const GLOBE_CONTEXT_AGENT_RUNTIME_EVENT = "rimvio-globe-context-agent-runtime";

let runtime: ContextAgentRuntimeState = {
  lifecycle: "idle",
  processPhase: null,
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
): void {
  emit({ lifecycle: "busy", processPhase });
}

export function setContextAgentProcessPhase(
  processPhase: ContextAgentProcessPhase,
): void {
  if (runtime.lifecycle !== "busy") {
    emit({ lifecycle: "busy", processPhase });
    return;
  }
  emit({ lifecycle: "busy", processPhase });
}

export function finishContextAgentWork(): void {
  emit({ lifecycle: "idle", processPhase: null });
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
