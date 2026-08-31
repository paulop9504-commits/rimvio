/**
 * Hub Background Agent — periodic observe → anomaly → improvement task (P5).
 * Does not execute user goals; evolves platform capabilities.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { readCapabilityDevelopmentRequests } from "@/lib/agent-os/capability-development-request";
import {
  readImprovementTasks,
  spawnImprovementTaskFromDevRequest,
  spawnImprovementTaskFromAnomaly,
} from "@/lib/rimvio-index/improvement-task-pool";
import { evaluateReuseGate } from "@/lib/rimvio-index/reuse-gate";

export type HubBackgroundTickResult = {
  readonly platformId: string;
  readonly openDevRequests: number;
  readonly tasksSpawned: number;
  readonly anomalies: readonly string[];
  readonly workLogKo: string;
};

export type HubBackgroundMetrics = {
  readonly capabilityCount: number;
  readonly failedTestRate: number;
  readonly openImprovementTasks: number;
};

/** Consume Main Agent CapabilityDevelopmentRequest queue for this platform. */
export function consumeMainAgentDevRequests(input: {
  readonly platformId: string;
}): readonly import("@/lib/rimvio-index/types").ImprovementTask[] {
  const platformId = input.platformId.trim();
  const requests = readCapabilityDevelopmentRequests().filter(
    (r) => r.status === "open",
  );
  const spawned: import("@/lib/rimvio-index/types").ImprovementTask[] = [];
  for (const req of requests) {
    const task = spawnImprovementTaskFromDevRequest({
      request: req,
      platformId,
    });
    if (task) spawned.push(task);
  }
  return spawned;
}

/** One background tick — observe metrics, enqueue improvement tasks. */
export function tickHubBackgroundAgent(input: {
  readonly platformId: string;
  readonly draft: PlatformDraft;
  readonly metrics?: HubBackgroundMetrics;
}): HubBackgroundTickResult {
  const platformId = input.platformId.trim() || "dev";
  const metrics = input.metrics ?? {
    capabilityCount: input.draft.actions.length,
    failedTestRate: 0,
    openImprovementTasks: readImprovementTasks().filter(
      (t) => t.platformId === platformId && t.status === "open",
    ).length,
  };

  const anomalies: string[] = [];
  let tasksSpawned = 0;

  const devTasks = consumeMainAgentDevRequests({ platformId });
  tasksSpawned += devTasks.length;

  if (metrics.failedTestRate > 0.25) {
    anomalies.push("test_failure_rate_high");
    const task = spawnImprovementTaskFromAnomaly({
      platformId,
      capabilityId: input.draft.actions[0]?.name ?? "platform.health",
      summaryKo: `테스트 실패율 ${Math.round(metrics.failedTestRate * 100)}% — Capability 점검`,
    });
    if (task) tasksSpawned += 1;
  }

  if (metrics.capabilityCount === 0) {
    anomalies.push("no_capabilities");
    const gate = evaluateReuseGate({ utterance: input.draft.name || "platform bootstrap" });
    if (gate.decision === "create") {
      anomalies.push("reuse_gate_create");
    }
  }

  const openDevRequests = readCapabilityDevelopmentRequests().filter(
    (r) => r.status === "open",
  ).length;

  const parts: string[] = [];
  if (tasksSpawned > 0) parts.push(`개선 Task ${tasksSpawned}건`);
  if (anomalies.length) parts.push(`이상 ${anomalies.length}건`);

  return {
    platformId,
    openDevRequests,
    tasksSpawned,
    anomalies,
    workLogKo: parts.join(" · ") || "Hub background — 정상",
  };
}
