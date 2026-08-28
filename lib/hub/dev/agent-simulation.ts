import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import { parseWorkflowGraph } from "@/lib/hub/dev/workflow-graph";
import {
  mountPlatformHostApis,
  readPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";

export type SimulationStepKind =
  | "user-intent"
  | "agent"
  | "discovery"
  | "capability"
  | "approval"
  | "result";

export type SimulationStepStatus = "pending" | "running" | "success" | "failed" | "skipped";

export type AgentSimulationStep = {
  readonly id: string;
  readonly label: string;
  readonly kind: SimulationStepKind;
  readonly capabilityId?: string;
  status: SimulationStepStatus;
  detail?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
};

const DEFAULT_UTTERANCE =
  "오사카 난바역 근처 호텔을 찾아서 예약해줘.";

export function buildAgentSimulationPlan(
  draft: PlatformDraft,
  utterance = DEFAULT_UTTERANCE,
): AgentSimulationStep[] {
  const graph = parseWorkflowGraph(draft);
  const platformName = draft.name || "Platform";

  const steps: AgentSimulationStep[] = [
    {
      id: "intent",
      label: `User Intent: "${utterance.slice(0, 48)}${utterance.length > 48 ? "…" : ""}"`,
      kind: "user-intent",
      status: "pending",
    },
    {
      id: "agent",
      label: "Rimvio Agent",
      kind: "agent",
      status: "pending",
    },
    {
      id: "discovery",
      label: "Capability Discovery",
      kind: "discovery",
      status: "pending",
      detail: `${platformName} · ${draft.actions.length} capabilities`,
    },
  ];

  for (const node of graph.nodes) {
    if (node.kind === "approval") {
      steps.push({
        id: node.id,
        label: "USER APPROVAL",
        kind: "approval",
        status: "pending",
      });
      continue;
    }
    steps.push({
      id: node.id,
      label: `${platformName}.${node.label}`,
      kind: "capability",
      capabilityId: node.capabilityId,
      status: "pending",
      detail: node.financial ? "⚠ Financial side effect" : undefined,
    });
  }

  steps.push({
    id: "result",
    label: "Booking Confirmed",
    kind: "result",
    status: "pending",
  });

  return steps;
}

export async function runAgentSimulation(
  draft: PlatformDraft,
  steps: AgentSimulationStep[],
  onUpdate: (id: string, patch: Partial<AgentSimulationStep>) => void,
): Promise<{ passed: boolean }> {
  const manifest = capabilityDraftToPlatformManifest(draft);
  const platformId = manifest.package.id;

  mountPlatformHostApis();
  registerPlatformManifest(manifest);
  const apis = readPlatformHostApis();

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const step of steps) {
    onUpdate(step.id, { status: "running" });

    if (step.kind === "user-intent" || step.kind === "agent" || step.kind === "discovery") {
      await delay(400);
      onUpdate(step.id, { status: "success" });
      continue;
    }

    if (step.kind === "approval") {
      await delay(500);
      onUpdate(step.id, {
        status: "success",
        detail: "Human approval gate (simulated)",
      });
      continue;
    }

    if (step.kind === "capability" && step.capabilityId) {
      const input =
        step.capabilityId === "hotel.search"
          ? { destination: "Namba Station", checkIn: "2026-06-15", checkOut: "2026-06-17", guests: 2 }
          : { prepare: true };

      const result = await apis.capabilities.invoke({
        platformId,
        capabilityId: step.capabilityId,
        input,
        approvalPolicy: step.capabilityId.includes("commit") ? "field_commit" : "user_required",
      });

      await delay(300);

      if (!result.ok) {
        onUpdate(step.id, {
          status: "failed",
          detail: result.errorKo ?? "Invoke failed",
        });
        return { passed: false };
      }

      onUpdate(step.id, {
        status: "success",
        input,
        output: (result.output as Record<string, unknown>) ?? { ok: true },
        detail: result.prepareOnly ? "prepareOnly" : "committed",
      });
      continue;
    }

    if (step.kind === "result") {
      await delay(300);
      onUpdate(step.id, { status: "success" });
    }
  }

  return { passed: true };
}
