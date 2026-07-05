/**
 * Globe Ingress compiler — pure, unidirectional, no domain search, no Commit.
 * @see docs/RIMVIO_GLOBE_INGRESS.md
 */

import type { ContextContainerKind } from "@/lib/context-blueprint/blueprint-constants";
import {
  composeTravelTripBlueprint,
  composeTradeBlueprint,
} from "@/lib/context-blueprint/examples/travel-trip-execution-graph";
import { composeContextBlueprint } from "@/lib/context-blueprint/types";
import { composeDefaultBridgeId } from "@/lib/context-os/vocabulary-v2";
import { classifyExperienceRunIntent } from "@/lib/experience-run/classify-experience-run-intent";
import { extractRunDestination } from "@/lib/experience-run/classify-experience-run-intent";
import type {
  GlobeIngressBridgeDraft,
  GlobeIngressCompileResult,
  GlobeIngressContextDraft,
  GlobeIngressContextSlot,
  GlobeIngressIntent,
} from "@/lib/globe-ingress/types";
import { composeRuntime } from "@/lib/runtime/types";

function composeGenericIngressBlueprint(input: {
  contextId: string;
  bridgeId: string;
  runtimeId: string;
  goal: string;
  runtimeKind: ContextContainerKind;
}) {
  return composeContextBlueprint({
    containerKind: input.runtimeKind,
    contextId: input.contextId,
    bridgeId: input.bridgeId,
    runtimeId: input.runtimeId,
    goal: input.goal,
    resourcePlan: {
      requiredResources: [],
      knownTruth: [],
      emptySlots: [],
      nextQuestion: null,
    },
    assignedExecutors: [],
    approvalPolicy: "manual",
  });
}

function proposeContextId(intent: string, existingContextId?: string | null): string {
  const existing = existingContextId?.trim();
  if (existing) {
    return existing;
  }
  const slug = intent
    .trim()
    .slice(0, 24)
    .replace(/[^a-zA-Z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `ctx-${slug || "intent"}-${Date.now()}`;
}

function resolveRuntimeKind(intent: string): ContextContainerKind {
  const travel = classifyExperienceRunIntent(intent);
  if (travel?.profile === "business_trip") {
    return "travel";
  }
  if (travel) {
    return "travel";
  }
  return "generic";
}

function composeContextDraft(input: {
  intent: string;
  contextId: string;
  runtimeKind: ContextContainerKind;
}): GlobeIngressContextDraft {
  const destination = extractRunDestination(input.intent);
  const slots: GlobeIngressContextSlot[] = [
    {
      key: "domain",
      value: input.runtimeKind,
      resolution: "confirmed",
    },
  ];
  if (destination) {
    slots.push({
      key: "destination",
      value: destination,
      resolution: "hypothesis",
    });
  } else if (input.runtimeKind === "travel") {
    slots.push({
      key: "destination",
      value: "unresolved",
      resolution: "unresolved",
    });
  }
  if (/일본|japan|오사카|osaka|tokyo|도쿄|후쿠오카/u.test(input.intent)) {
    slots.push({ key: "region", value: "Japan", resolution: "hypothesis" });
  }
  if (/여행|trip|travel/u.test(input.intent)) {
    slots.push({ key: "frame", value: "travel", resolution: "confirmed" });
  }
  return {
    contextId: input.contextId,
    goal: input.intent.trim(),
    runtimeKind: input.runtimeKind,
    slots,
  };
}

function composeBridgeDraft(input: {
  contextId: string;
  bridgeId: string;
  runtimeKind: ContextContainerKind;
  destination: string | null;
}): GlobeIngressBridgeDraft {
  if (input.runtimeKind === "travel") {
    const stay = input.destination ?? "Stay region";
    return {
      bridgeId: input.bridgeId,
      pathLabels: ["집", "공항", stay, "호텔"],
      linkedContextIds: [input.contextId],
    };
  }
  if (input.runtimeKind === "trade") {
    return {
      bridgeId: input.bridgeId,
      pathLabels: ["집", "Listing", "Meetup"],
      linkedContextIds: [input.contextId],
    };
  }
  return {
    bridgeId: input.bridgeId,
    pathLabels: [input.contextId],
    linkedContextIds: [input.contextId],
  };
}

/** Globe OS kernel scheduler — Intent → OS execution structure (pure). */
export function compileGlobeIngress(input: GlobeIngressIntent): GlobeIngressCompileResult {
  const intent = input.text.trim();
  if (!intent) {
    throw new Error("[GlobeIngress] intent text required");
  }

  const runtimeKind = resolveRuntimeKind(intent);
  const contextId = proposeContextId(intent, input.existingContextId);
  const bridgeId = composeDefaultBridgeId(contextId);

  const context = composeContextDraft({ intent, contextId, runtimeKind });
  const destination =
    context.slots.find((row) => row.key === "destination")?.value ?? null;
  const bridge = composeBridgeDraft({
    contextId,
    bridgeId,
    runtimeKind,
    destination: destination === "unresolved" ? null : destination,
  });

  const runtime = composeRuntime({
    contextId,
    bridgeId,
    runtimeKind,
  });

  const blueprint =
    runtimeKind === "travel"
      ? composeTravelTripBlueprint({
          contextId,
          bridgeId,
          runtimeId: runtime.runtimeId,
          goal: context.goal,
        })
      : runtimeKind === "trade"
        ? composeTradeBlueprint({
            contextId,
            bridgeId,
            runtimeId: runtime.runtimeId,
            goal: context.goal,
          })
        : composeGenericIngressBlueprint({
            contextId,
            bridgeId,
            runtimeId: runtime.runtimeId,
            goal: context.goal,
            runtimeKind,
          });

  return {
    intent,
    context,
    bridge,
    runtime,
    blueprint,
  };
}

/** Travel trip frame eligible for Globe Ingress (not lodging-only search). */
export function isGlobeIngressEligible(intent: string): boolean {
  const text = intent.trim();
  if (!text) {
    return false;
  }
  const classified = classifyExperienceRunIntent(text);
  if (!classified) {
    return false;
  }
  if (
    classified.profile === "lodging_search" ||
    classified.profile === "eatery_search"
  ) {
    return false;
  }
  return true;
}
