/**
 * Advance Globe Ingress flow when destination is confirmed.
 * Updates Blueprint (off-surface) + Reality Surface projection.
 */

import type { ExecutionGraphNode } from "@/lib/context-blueprint/execution-graph";
import { composeExecutionGraph } from "@/lib/context-blueprint/execution-graph";
import { composePhysicalSpatialTarget } from "@/lib/context-blueprint/spatial-target";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import type { RealitySurfaceSession } from "@/lib/reality-surface/project-globe-ingress";
import { composeRealitySurfaceFromBlueprint } from "@/lib/reality-surface/project-globe-ingress";

const DESTINATION_CHOICE_LABELS = ["오사카", "도쿄", "후쿠오카"] as const;

const DESTINATION_ALIASES: Readonly<Record<string, string>> = {
  osaka: "오사카",
  tokyo: "도쿄",
  fukuoka: "후쿠오카",
  大阪: "오사카",
  東京: "도쿄",
  福岡: "후쿠오카",
};

function normalizeDestinationLabel(raw: string): string {
  const trimmed = raw.trim();
  const alias = DESTINATION_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

function resolveArrivalLabel(destinationLabel: string): string {
  const hay = destinationLabel.toLowerCase();
  if (hay.includes("도쿄") || hay.includes("tokyo")) {
    return "하네다공항";
  }
  if (hay.includes("후쿠오카") || hay.includes("fukuoka")) {
    return "후쿠오카공항";
  }
  return "간사이공항";
}

function patchExecutionNode(
  node: ExecutionGraphNode,
  _destinationLabel: string,
): ExecutionGraphNode {
  if (node.id === "trip" || node.id === "prepare") {
    return { ...node, status: "done" };
  }
  if (node.id === "departure" || node.id === "arrival") {
    return { ...node, status: "pending" };
  }
  if (node.id === "stay") {
    return {
      ...node,
      resolution: "hypothesis",
      status: "running",
      label: "Stay",
    };
  }
  return node;
}

function patchBridgePathLabels(
  pathLabels: readonly string[],
  destinationLabel: string,
): string[] {
  if (pathLabels.length === 0) {
    return ["집", "공항", destinationLabel, "호텔"];
  }
  return pathLabels.map((label, index) => {
    if (index === 2) {
      return destinationLabel;
    }
    if (label === "Stay region" || label === "unresolved") {
      return destinationLabel;
    }
    return label;
  });
}

export function blueprintNeedsDestination(blueprint: ContextBlueprint): boolean {
  return blueprint.resourcePlan.emptySlots.includes("destination");
}

/** Resolve destination label from chip tap or composer text. */
export function resolveDestinationFromMessage(message: string): string | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  const normalized = text.toLowerCase();
  for (const label of DESTINATION_CHOICE_LABELS) {
    if (text.includes(label) || normalized.includes(label.toLowerCase())) {
      return label;
    }
  }
  for (const [alias, label] of Object.entries(DESTINATION_ALIASES)) {
    if (normalized.includes(alias)) {
      return label;
    }
  }
  const anchor = resolveTripContextAnchor(text);
  if (anchor && text.length <= 24) {
    return anchor.placeLabel;
  }
  return null;
}

export function patchTravelBlueprintForDestination(
  blueprint: ContextBlueprint,
  destinationLabel: string,
): ContextBlueprint {
  const label = normalizeDestinationLabel(destinationLabel);
  const anchor = resolveTripContextAnchor(label);
  const arrivalLabel = resolveArrivalLabel(label);
  const graph = blueprint.executionGraph;
  const nodes = graph?.nodes.map((node) => patchExecutionNode(node, label)) ?? [];

  const spatialTargets = blueprint.spatialTargets
    ? {
        ...blueprint.spatialTargets,
        byNodeId: {
          ...blueprint.spatialTargets.byNodeId,
          arrival: composePhysicalSpatialTarget({
            label: arrivalLabel,
            resolution: "hypothesis",
          }),
          stay: composePhysicalSpatialTarget({
            label,
            resolution: "hypothesis",
            lat: anchor?.lat ?? null,
            lng: anchor?.lng ?? null,
            linkedSlotId: "destination",
          }),
        },
      }
    : blueprint.spatialTargets;

  const knownTruth = [
    ...blueprint.resourcePlan.knownTruth.filter((row) => row.slotId !== "destination"),
    {
      slotId: "destination",
      value: label,
      source: "user_stated" as const,
      confidence: 0.95,
    },
  ];

  const emptySlots = blueprint.resourcePlan.emptySlots.filter(
    (slot) => slot !== "destination",
  );

  return {
    ...blueprint,
    executionGraph: graph
      ? composeExecutionGraph({ nodes, edges: graph.edges })
      : graph,
    spatialTargets,
    resourcePlan: {
      ...blueprint.resourcePlan,
      knownTruth,
      emptySlots,
      nextQuestion: {
        slotId: "lodging_place",
        promptKo: `${label}에서 묵을 곳을 찾을까요?`,
      },
    },
    constraints: {
      ...blueprint.constraints,
      destination: anchor
        ? {
            label: anchor.placeLabel,
            lat: anchor.lat,
            lng: anchor.lng,
          }
        : { label },
    },
  };
}

export function advanceRealitySurfaceDestination(input: {
  session: RealitySurfaceSession;
  destinationLabel: string;
}): RealitySurfaceSession {
  const destinationLabel = normalizeDestinationLabel(input.destinationLabel);
  const blueprint = patchTravelBlueprintForDestination(
    input.session.operatorBlueprint,
    destinationLabel,
  );
  const bridgePathLabels = patchBridgePathLabels(
    input.session.projection.bridge?.pathLabels ?? [],
    destinationLabel,
  );

  return composeRealitySurfaceFromBlueprint({
    eventId: input.session.eventId,
    goalKo: input.session.projection.context?.goalKo ?? blueprint.goal,
    bridgePathLabels,
    blueprint,
    runtimeId: input.session.projection.runtime?.runtimeId ?? blueprint.runtimeId,
  });
}

export { DESTINATION_CHOICE_LABELS };
