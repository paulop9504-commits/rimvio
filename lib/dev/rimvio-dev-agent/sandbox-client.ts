import type { SandboxEvent } from "@/lib/sandbox/types";

export type SerializedSandboxSession = {
  sessionId: string;
  executionId: string;
  status: string;
  lifecycleStatus: string;
  capability: string;
  runtime: string;
  browser: string;
  environment: string;
  flowStage: string;
  userRequest: string;
  intent: string;
  resultText: string;
  currentStep: string | null;
  input: Record<string, unknown>;
  output: unknown | null;
  events: SandboxEvent[];
  latestScreenshot: string | null;
  screenshots: Array<{ step: string; dataUrl: string; timestamp: number }>;
  currentAction: string | null;
  agentCursor: {
    x: number;
    y: number;
    visible: boolean;
    label: string;
    targetSelector?: string | null;
  };
  metrics: {
    executionMs: number;
    actionCount: number;
    successRate: number;
    stepCount: number;
  };
  verification: { ok: boolean; errors: string[] } | null;
  structuredError: {
    code: string;
    message: string;
    step: string;
    recoverable: boolean;
  } | null;
  error: string | null;
  retryOf: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export async function createSandboxSession(input: {
  capability: string;
  userRequest?: string;
  input?: Record<string, unknown>;
}): Promise<SerializedSandboxSession> {
  const res = await fetch("/api/sandbox/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("sandbox_session_create_failed");
  }
  return (await res.json()) as SerializedSandboxSession;
}

export async function createExecution(input: {
  capability: string;
  userRequest?: string;
  input?: Record<string, unknown>;
}): Promise<SerializedSandboxSession> {
  const res = await fetch("/api/sandbox/executions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("sandbox_execution_create_failed");
  }
  return (await res.json()) as SerializedSandboxSession;
}

export async function startSandboxRun(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sandbox/sessions/${sessionId}/run`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("sandbox_run_failed");
  }
}

export async function fetchSandboxSession(sessionId: string): Promise<SerializedSandboxSession> {
  const res = await fetch(`/api/sandbox/sessions/${sessionId}`);
  if (!res.ok) {
    throw new Error("sandbox_session_not_found");
  }
  return (await res.json()) as SerializedSandboxSession;
}

export async function stopSandboxExecution(executionId: string): Promise<SerializedSandboxSession> {
  const res = await fetch(`/api/sandbox/executions/${executionId}/stop`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("sandbox_stop_failed");
  }
  return (await res.json()) as SerializedSandboxSession;
}

export async function retrySandboxExecution(executionId: string): Promise<SerializedSandboxSession> {
  const res = await fetch(`/api/sandbox/executions/${executionId}/retry`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("sandbox_retry_failed");
  }
  return (await res.json()) as SerializedSandboxSession;
}

export function subscribeSandboxStream(
  executionId: string,
  onMessage: (payload: {
    type: string;
    session: SerializedSandboxSession;
    event?: SandboxEvent;
  }) => void,
  onError?: () => void,
): () => void {
  const source = new EventSource(`/api/sandbox/executions/${executionId}/stream`);
  source.onmessage = (message) => {
    try {
      const payload = JSON.parse(message.data) as {
        type: string;
        session: SerializedSandboxSession;
        event?: SandboxEvent;
      };
      onMessage(payload);
    } catch {
      onError?.();
    }
  };
  source.onerror = () => {
    onError?.();
    source.close();
  };
  return () => source.close();
}

export function mapSessionPhase(
  session: SerializedSandboxSession,
): "idle" | "typing-location" | "setting-dates" | "clicking-search" | "loading" | "results" {
  const action = session.currentAction ?? "";
  if (session.status === "success") {
    return "results";
  }
  if (action.includes("location") || action.includes("Entering")) {
    return "typing-location";
  }
  if (action.includes("dates") || action.includes("Setting")) {
    return "setting-dates";
  }
  if (action.includes("search") || action.includes("Clicking") || action.includes("Submitting")) {
    return "clicking-search";
  }
  if (action.includes("Extract") || action.includes("results") || action.includes("Waiting")) {
    return "loading";
  }
  if (session.status === "running") {
    return "loading";
  }
  return "idle";
}

export function hotelsFromSession(session: SerializedSandboxSession): number {
  const output = session.output as { hotelsFound?: number } | null;
  if (output?.hotelsFound) {
    return output.hotelsFound;
  }
  const match = session.resultText.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function productsFromSession(session: SerializedSandboxSession): number {
  const output = session.output as { products?: unknown[] } | null;
  if (output?.products) {
    return output.products.length;
  }
  const match = session.resultText.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function isTerminalSession(session: SerializedSandboxSession): boolean {
  return (
    session.lifecycleStatus === "COMPLETED" ||
    session.lifecycleStatus === "FAILED" ||
    session.lifecycleStatus === "CANCELLED" ||
    session.status === "success" ||
    session.status === "failed" ||
    session.status === "cancelled"
  );
}
