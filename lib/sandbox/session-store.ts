import type { CreateSandboxSessionInput, SandboxSession } from "./types";
import { persistSandboxSessionSnapshot } from "@/lib/agent-platform/persistence/durable-store";

const sessions = new Map<string, SandboxSession>();

function createSessionId(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `sbx_${suffix}`;
}

export function createSandboxSession(input: CreateSandboxSessionInput): SandboxSession {
  const now = Date.now();
  const sessionId = createSessionId();
  const session: SandboxSession = {
    sessionId,
    executionId: sessionId,
    userId: input.userId ?? null,
    projectId: input.projectId ?? null,
    capability: input.capability,
    runtimeId: input.runtimeId ?? "browser-chromium",
    runtime: "browser",
    browser: "chromium",
    environment: "sandbox",
    lifecycleStatus: "CREATED",
    status: "idle",
    flowStage: "request",
    userRequest: input.userRequest ?? "",
    intent: "",
    resultText: "",
    currentStep: null,
    input: input.input ?? {},
    output: null,
    events: [],
    latestScreenshot: null,
    screenshots: [],
    currentAction: null,
    agentCursor: { x: 42, y: 38, visible: false, label: "Cloud Agent" },
    metrics: { executionMs: 0, actionCount: 0, successRate: 100, stepCount: 0 },
    verification: null,
    structuredError: null,
    error: null,
    retryOf: input.retryOf ?? null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(session.sessionId, session);
  persistSandboxSessionSnapshot(session);
  return session;
}

export function getSandboxSession(sessionId: string): SandboxSession | null {
  return sessions.get(sessionId) ?? null;
}

export function updateSandboxSession(
  sessionId: string,
  patch: Partial<SandboxSession>,
): SandboxSession | null {
  const current = sessions.get(sessionId);
  if (!current) {
    return null;
  }
  const next = { ...current, ...patch, updatedAt: Date.now() };
  sessions.set(sessionId, next);
  persistSandboxSessionSnapshot(next);
  return next;
}

export function listSandboxSessions(): SandboxSession[] {
  return [...sessions.values()].sort((a, b) => b.createdAt - a.createdAt);
}
