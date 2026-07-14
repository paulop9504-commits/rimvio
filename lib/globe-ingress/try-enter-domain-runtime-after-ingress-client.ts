"use client";

/**
 * Gap 2 — after Globe Ingress creates structure, enter domain Runtime when safe.
 * Does not auto-Commit. Does not skip plan_waiting_approval (human gate).
 */

import { appendContextAgentComposeTurn } from "@/lib/globe/assistant";
import { offerPlanStepHandoffAfterAdvance } from "@/lib/context-execution/offer-plan-step-handoff-client";
import { startContextExecutionPlanRuntime } from "@/lib/context-execution/advance-plan-step";
import { persistContextExecutionPlanClientAsync } from "@/lib/context-execution/persist-context-execution-plan-client";
import { recordPlanSequencerProgress } from "@/lib/context-execution/record-plan-sequencer-progress";
import {
  needsContextExecutionPlanApproval,
} from "@/lib/context-execution/resolve-plan-approval-gate";
import type { GlobeIngressCompileResult } from "@/lib/globe-ingress/types";
import { requestOperatorAutoRun } from "@/lib/globe/operator-turn/operator-auto-run-bridge";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { composeRealitySurfaceFromGlobeIngress } from "@/lib/reality-surface/project-globe-ingress";

function destinationConfirmed(compiled: GlobeIngressCompileResult): boolean {
  return !compiled.blueprint.resourcePlan.emptySlots.includes("destination");
}

/**
 * After ingress compile — start Runtime when auto-approved, or nudge lodging scout
 * once destination is confirmed.
 */
export function tryEnterDomainRuntimeAfterIngress(input: {
  compiled: GlobeIngressCompileResult;
  eventId: string;
}): "auto_scout" | "waiting_plan_approval" | "seeded" | "noop" {
  const eventId = input.eventId.trim();
  if (!eventId) {
    return "noop";
  }

  const session = composeRealitySurfaceFromGlobeIngress({
    compiled: input.compiled,
    eventId,
  });
  let plan = session.executionPlan ?? null;
  if (!plan) {
    return "noop";
  }

  if (needsContextExecutionPlanApproval(plan)) {
    recordPlanSequencerProgress({
      contextEventId: eventId,
      phase: "ingress_domain",
      detailKo: "계획을 확인한 뒤 실행할 수 있어요",
    });
    appendContextAgentComposeTurn(eventId, {
      role: "assistant",
      kind: "text",
      text: "여행 뼈대를 잡았어요 — 「좋아, 실행」하면 숙소부터 맞춰 둘게요.",
    });
    return "waiting_plan_approval";
  }

  // Auto-approved plan still in planned phase → start Runtime once.
  if (
    plan.osPhase === "execution_planned" ||
    plan.osPhase === "blueprint_created"
  ) {
    plan = startContextExecutionPlanRuntime({ plan });
    void persistContextExecutionPlanClientAsync({
      contextEventId: eventId,
      plan,
    });
  }

  if (plan.osPhase === "executing") {
    const advanced = offerPlanStepHandoffAfterAdvance({
      contextEventId: eventId,
      plan,
    });
    if (advanced) {
      return "auto_scout";
    }
  }

  if (destinationConfirmed(input.compiled)) {
    const event = findLifeEventCandidate(eventId);
    const seed =
      event?.place?.trim()
        ? `${event.place.trim()} 주변 호텔 찾아줘`
        : "주변 호텔 찾아줘";
    recordPlanSequencerProgress({
      contextEventId: eventId,
      engineId: "lodging_search",
      phase: "ingress_domain",
      detailKo: "목적지가 보여서 숙소 후보를 맞추기 시작해요",
    });
    appendContextAgentComposeTurn(eventId, {
      role: "assistant",
      kind: "text",
      text: "목적지를 읽었어요 — 숙소 후보를 맞추는 중이에요…",
    });
    requestOperatorAutoRun({
      contextEventId: eventId,
      text: seed,
      source: "ingress_domain_entry",
      progressKo: "숙소 후보를 맞추는 중이에요…",
      expressReady: true,
    });
    return "seeded";
  }

  return "noop";
}
