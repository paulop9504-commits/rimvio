/**
 * Product path — Intent → Semantic Index → Reuse gate → Reuse | Improve | Create (ADR-066).
 * Policy SSOT: lib/hub/standards MAIN_AGENT_CAPABILITY_POLICY (Reuse Before Create).
 */

import { MAIN_AGENT_CAPABILITY_POLICY } from "@/lib/hub/standards";

import { planCapabilityDiscovery } from "@/lib/platform-sdk/discover-capabilities";
import type { CapabilityIntentResolution } from "@/lib/rimvio-index/types";
import { evaluateReuseGate } from "@/lib/rimvio-index/reuse-gate";
import { spawnImprovementTaskFromReuseGate } from "@/lib/rimvio-index/improvement-task-pool";
import {
  capabilityDevelopmentRequestFromReuseGate,
  submitCapabilityDevelopmentRequestToHub,
} from "@/lib/agent-os/capability-development-request";

export function resolveCapabilityIntent(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
  readonly marketCountry?: string;
}): CapabilityIntentResolution {
  const utterance = input.utterance.trim();
  const reuse = evaluateReuseGate({
    utterance,
    marketCountry: input.marketCountry,
  });

  let improvementTaskId: string | null = null;
  if (reuse.decision === "improve") {
    const task = spawnImprovementTaskFromReuseGate({
      reuse,
      utterance,
      contextEventId: input.contextEventId,
    });
    improvementTaskId = task?.taskId ?? null;
  }

  if (reuse.decision === "create") {
    const devRequest = capabilityDevelopmentRequestFromReuseGate({
      utterance,
      reuse,
      contextEventId: input.contextEventId,
    });
    submitCapabilityDevelopmentRequestToHub(devRequest);
  }

  const discovery =
    reuse.decision === "reuse"
      ? planCapabilityDiscovery({ utterance })
      : null;

  const workLogKo =
    reuse.decision === "reuse" && discovery
      ? `${reuse.reasonKo} · ${discovery.planLabelKo}`
      : reuse.reasonKo;

  return {
    utterance,
    reuse,
    discoveryPlanCapabilityId: discovery?.capabilityId ?? reuse.topHit?.capabilityId ?? null,
    improvementTaskId,
    workLogKo,
    policyVersion: MAIN_AGENT_CAPABILITY_POLICY.version,
  };
}
