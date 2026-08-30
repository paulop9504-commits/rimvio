/**
 * Capability Improvement Task pool — Improve Before Fork (ADR-066).
 */

import type { ImprovementTask, ImprovementTaskStatus } from "@/lib/rimvio-index/types";
import type { ReuseGateResult } from "@/lib/rimvio-index/types";
import type { CapabilityDevelopmentRequest } from "@/lib/agent-os/capability-development-request";
import { markCapabilityDevelopmentRequestAccepted } from "@/lib/agent-os/capability-development-request";

const STORAGE_KEY = "rimvio-improvement-tasks-v1";
const memory: ImprovementTask[] = [];
let counter = 0;

function nextId(): string {
  counter += 1;
  return `IMPR-${Date.now()}-${counter}`;
}

function readAll(): ImprovementTask[] {
  if (typeof window === "undefined") return [...memory];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ImprovementTask[];
  } catch {
    return [];
  }
}

function writeAll(tasks: ImprovementTask[]): void {
  if (typeof window === "undefined") {
    memory.length = 0;
    memory.push(...tasks);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("rimvio:improvement-tasks"));
  }
}

export function readImprovementTasks(): readonly ImprovementTask[] {
  return readAll();
}

export function spawnImprovementTaskFromReuseGate(input: {
  readonly reuse: ReuseGateResult;
  readonly utterance: string;
  readonly contextEventId?: string | null;
  readonly assigneeDeveloperId?: string | null;
}): ImprovementTask | null {
  if (input.reuse.decision !== "improve" || !input.reuse.topHit) {
    return null;
  }

  const hit = input.reuse.topHit;
  const existing = readAll().find(
    (t) =>
      t.capabilityId === hit.capabilityId &&
      t.status !== "merged" &&
      t.status !== "rejected" &&
      t.intentUtterance === input.utterance.trim(),
  );
  if (existing) return existing;

  const task: ImprovementTask = {
    taskId: nextId(),
    capabilityId: hit.capabilityId,
    platformId: hit.platformId,
    intentUtterance: input.utterance.trim(),
    similarity: input.reuse.similarity,
    status: "open",
    assigneeDeveloperId: input.assigneeDeveloperId ?? null,
    summaryKo: `${hit.capabilityId} 개선 · ${input.utterance.trim().slice(0, 48)}`,
    createdAt: new Date().toISOString(),
    contextEventId: input.contextEventId ?? null,
  };

  writeAll([...readAll(), task]);
  return task;
}

export function updateImprovementTaskStatus(
  taskId: string,
  status: ImprovementTaskStatus,
): ImprovementTask | null {
  const tasks = readAll();
  const idx = tasks.findIndex((t) => t.taskId === taskId);
  if (idx < 0) return null;
  const updated: ImprovementTask = { ...tasks[idx]!, status };
  tasks[idx] = updated;
  writeAll(tasks);
  return updated;
}

export function spawnImprovementTaskFromDevRequest(input: {
  readonly request: CapabilityDevelopmentRequest;
  readonly platformId: string;
}): ImprovementTask | null {
  if (input.request.status !== "open") return null;

  const existing = readAll().find(
    (t) =>
      t.platformId === input.platformId &&
      t.capabilityId === input.request.capabilityType &&
      t.status !== "merged" &&
      t.status !== "rejected",
  );
  if (existing) {
    markCapabilityDevelopmentRequestAccepted(input.request.requestId);
    return existing;
  }

  const task: ImprovementTask = {
    taskId: nextId(),
    capabilityId: input.request.capabilityType,
    platformId: input.platformId,
    intentUtterance: input.request.goal,
    similarity: 0,
    status: "open",
    assigneeDeveloperId: null,
    summaryKo: `Hub 개발 · ${input.request.capabilityType}`,
    createdAt: new Date().toISOString(),
    contextEventId: input.request.contextEventId ?? null,
  };
  writeAll([...readAll(), task]);
  markCapabilityDevelopmentRequestAccepted(input.request.requestId);
  return task;
}

export function spawnImprovementTaskFromAnomaly(input: {
  readonly platformId: string;
  readonly capabilityId: string;
  readonly summaryKo: string;
}): ImprovementTask | null {
  const task: ImprovementTask = {
    taskId: nextId(),
    capabilityId: input.capabilityId,
    platformId: input.platformId,
    intentUtterance: input.summaryKo,
    similarity: 0,
    status: "open",
    assigneeDeveloperId: null,
    summaryKo: input.summaryKo,
    createdAt: new Date().toISOString(),
    contextEventId: null,
  };
  writeAll([...readAll(), task]);
  return task;
}

export function resetImprovementTasksForTests(): void {
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
