/**
 * Main → Hub capability development contract (P0).
 *
 * Main Agent never implements capabilities — it submits requests to Hub boundary.
 */

import type { ReuseGateResult } from "@/lib/rimvio-index/types";
import type { RimvioAgentRole } from "@/lib/agent-os/agent-role";

export type CapabilityDevelopmentRequestStatus =
  | "open"
  | "accepted"
  | "in_progress"
  | "review"
  | "completed"
  | "rejected";

export type CapabilityDevelopmentRequestPriority = "low" | "normal" | "high";

export type CapabilityDevelopmentRequest = {
  readonly requestId: string;
  readonly goal: string;
  readonly capabilityType: string;
  readonly requiredInput?: Record<string, unknown>;
  readonly requiredOutput?: Record<string, unknown>;
  readonly reason: string;
  readonly relatedCapabilities: readonly string[];
  readonly workspaceId: string | null;
  readonly contextEventId: string | null;
  readonly priority: CapabilityDevelopmentRequestPriority;
  readonly sourceRole: Extract<RimvioAgentRole, "main">;
  readonly status: CapabilityDevelopmentRequestStatus;
  readonly createdAt: string;
  readonly improvementTaskId?: string | null;
};

const STORAGE_KEY = "rimvio-capability-dev-requests-v1";
const memory: CapabilityDevelopmentRequest[] = [];
let counter = 0;

function nextRequestId(): string {
  counter += 1;
  return `CDR-${Date.now()}-${counter}`;
}

function readAll(): CapabilityDevelopmentRequest[] {
  if (typeof window === "undefined") return [...memory];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CapabilityDevelopmentRequest[];
  } catch {
    return [];
  }
}

function writeAll(requests: CapabilityDevelopmentRequest[]): void {
  if (typeof window === "undefined") {
    memory.length = 0;
    memory.push(...requests);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent("rimvio:capability-dev-request"));
}

export function readCapabilityDevelopmentRequests(): readonly CapabilityDevelopmentRequest[] {
  return readAll();
}

export function createCapabilityDevelopmentRequest(input: {
  readonly goal: string;
  readonly capabilityType: string;
  readonly reason: string;
  readonly relatedCapabilities?: readonly string[];
  readonly workspaceId?: string | null;
  readonly contextEventId?: string | null;
  readonly priority?: CapabilityDevelopmentRequestPriority;
  readonly requiredInput?: Record<string, unknown>;
  readonly requiredOutput?: Record<string, unknown>;
}): CapabilityDevelopmentRequest {
  const goal = input.goal.trim();
  const capabilityType = input.capabilityType.trim();
  const existing = readAll().find(
    (r) =>
      r.status === "open" &&
      r.goal === goal &&
      r.capabilityType === capabilityType &&
      r.contextEventId === (input.contextEventId ?? null),
  );
  if (existing) return existing;

  const request: CapabilityDevelopmentRequest = {
    requestId: nextRequestId(),
    goal,
    capabilityType,
    requiredInput: input.requiredInput,
    requiredOutput: input.requiredOutput,
    reason: input.reason.trim(),
    relatedCapabilities: input.relatedCapabilities ?? [],
    workspaceId: input.workspaceId ?? null,
    contextEventId: input.contextEventId ?? null,
    priority: input.priority ?? "normal",
    sourceRole: "main",
    status: "open",
    createdAt: new Date().toISOString(),
  };

  writeAll([...readAll(), request]);
  return request;
}

/** Build request from reuse gate when decision is create (no suitable capability). */
export function capabilityDevelopmentRequestFromReuseGate(input: {
  readonly utterance: string;
  readonly reuse: ReuseGateResult;
  readonly contextEventId?: string | null;
  readonly capabilityType?: string;
}): CapabilityDevelopmentRequest {
  const related = input.reuse.hits.map((h) => h.capabilityId).slice(0, 8);
  return createCapabilityDevelopmentRequest({
    goal: input.utterance.trim(),
    capabilityType:
      input.capabilityType ??
      input.reuse.topHit?.capabilityId ??
      "capability.new",
    reason: input.reuse.reasonKo,
    relatedCapabilities: related,
    workspaceId: input.contextEventId ?? null,
    contextEventId: input.contextEventId ?? null,
    priority: input.reuse.similarity < 0.2 ? "high" : "normal",
  });
}

/**
 * Submit request to Hub boundary — stores locally; Hub loop consumes in P5+.
 */
export function submitCapabilityDevelopmentRequestToHub(
  request: CapabilityDevelopmentRequest,
): CapabilityDevelopmentRequest {
  const all = readAll();
  const idx = all.findIndex((r) => r.requestId === request.requestId);
  if (idx < 0) {
    writeAll([...all, request]);
    return request;
  }
  return all[idx]!;
}

export function markCapabilityDevelopmentRequestAccepted(
  requestId: string,
): CapabilityDevelopmentRequest | null {
  const all = readAll();
  const idx = all.findIndex((r) => r.requestId === requestId);
  if (idx < 0) return null;
  const updated: CapabilityDevelopmentRequest = {
    ...all[idx]!,
    status: "accepted",
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function resetCapabilityDevelopmentRequestsForTests(): void {
  memory.length = 0;
  counter = 0;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
