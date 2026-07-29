/**
 * Advance Globe Ingress flow when destination is confirmed.
 * Updates Blueprint (off-surface) + Reality Surface projection.
 */

import type { ExecutionGraphNode } from "@/lib/context-blueprint/execution-graph";
import { composeExecutionGraph } from "@/lib/context-blueprint/execution-graph";
import { composePhysicalSpatialTarget } from "@/lib/context-blueprint/spatial-target";
import type { ContextBlueprint } from "@/lib/context-blueprint/types";
import {
  patchTravelExecutionPlanForDestination,
} from "@/lib/context-execution";
import type { DepartureHubAirport } from "@/lib/globe/departure-hub-airports";
import { resolveTripContextAnchor } from "@/lib/experience-run/resolve-trip-context-anchor";
import type { RealitySurfaceSession } from "@/lib/reality-surface/project-globe-ingress";
import { composeRealitySurfaceFromBlueprint } from "@/lib/reality-surface/project-globe-ingress";
import {
  FALLBACK_DESTINATION_HUBS,
  listHubLabelsForCountry,
  matchCountryTravelFrame,
  matchHubInAnyFrame,
} from "@/lib/globe/country-travel-hubs";

const DESTINATION_ALIASES: Readonly<Record<string, string>> = {
  osaka: "오사카",
  tokyo: "도쿄",
  fukuoka: "후쿠오카",
  大阪: "오사카",
  東京: "도쿄",
  福岡: "후쿠오카",
  manila: "마닐라",
  cebu: "세부",
  boracay: "보라카이",
  palawan: "팔라완",
  bohol: "보홀",
  bali: "발리",
  phuket: "푸켓",
  bangkok: "방콕",
};

function readRegionLabel(blueprint: ContextBlueprint): string | null {
  const fromTruth = blueprint.resourcePlan.knownTruth.find(
    (row) => row.slotId === "region",
  )?.value;
  if (typeof fromTruth === "string" && fromTruth.trim()) {
    return fromTruth.trim();
  }
  return null;
}

/** Hub labels for destination chips — country-aware when region is known. */
export function destinationChoiceLabelsForBlueprint(
  blueprint: ContextBlueprint | null | undefined,
): readonly string[] {
  const region = blueprint ? readRegionLabel(blueprint) : null;
  const hubs = listHubLabelsForCountry(region);
  if (hubs.length > 0) return hubs;
  return FALLBACK_DESTINATION_HUBS.map((h) => h.label);
}

/** @deprecated Prefer destinationChoiceLabelsForBlueprint — Japan default. */
export const DESTINATION_CHOICE_LABELS = [
  "오사카",
  "도쿄",
  "후쿠오카",
] as const;

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
  if (node.id === "stay") {
    return {
      ...node,
      resolution: "hypothesis",
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

export function blueprintNeedsDepartureConfirm(blueprint: ContextBlueprint): boolean {
  return blueprint.resourcePlan.emptySlots.includes("departure_hub");
}

/** Resolve destination label from chip tap or composer text. */
export function resolveDestinationFromMessage(
  message: string,
  blueprint?: ContextBlueprint | null,
): string | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  const normalized = text.toLowerCase();

  const region = blueprint ? readRegionLabel(blueprint) : null;
  const frame = matchCountryTravelFrame(region);
  if (frame) {
    const hub = matchHubInAnyFrame(text);
    if (hub && hub.frame.countryId === frame.countryId) {
      return hub.hub.labelKo;
    }
    for (const label of frame.hubs.map((h) => h.labelKo)) {
      if (text.includes(label) || normalized.includes(label.toLowerCase())) {
        return label;
      }
    }
  }

  const anyHub = matchHubInAnyFrame(text);
  if (anyHub) {
    return anyHub.hub.labelKo;
  }

  for (const label of destinationChoiceLabelsForBlueprint(blueprint)) {
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

  const emptySlots = [
    ...blueprint.resourcePlan.emptySlots.filter((slot) => slot !== "destination"),
    "departure_hub",
  ];

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
        slotId: "departure_hub",
        promptKo: `${label} · 출발 공항을 확인할게요`,
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
  let blueprint = patchTravelBlueprintForDestination(
    input.session.operatorBlueprint,
    destinationLabel,
  );
  const executionPlan = patchTravelExecutionPlanForDestination({
    blueprint,
    plan: input.session.executionPlan ?? null,
    contextId: input.session.eventId,
  });
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
    executionPlan,
  });
}

function patchBridgeDepartureLabel(
  pathLabels: readonly string[],
  departureAirportLabel: string,
): string[] {
  if (pathLabels.length === 0) {
    return ["집", departureAirportLabel, "목적지", "호텔"];
  }
  return pathLabels.map((label, index) => {
    if (index === 1 || label === "공항" || label.includes("공항")) {
      return departureAirportLabel;
    }
    return label;
  });
}

export function patchTravelBlueprintForDepartureHub(
  blueprint: ContextBlueprint,
  input: {
    hub: DepartureHubAirport;
    homeLabel: string;
    homeLat?: number | null;
    homeLng?: number | null;
  },
): ContextBlueprint {
  const hub = input.hub;
  const homeLabel = input.homeLabel.trim() || "집";
  const spatialTargets = blueprint.spatialTargets
    ? {
        ...blueprint.spatialTargets,
        byNodeId: {
          ...blueprint.spatialTargets.byNodeId,
          prepare: composePhysicalSpatialTarget({
            label: homeLabel,
            resolution: "confirmed",
            lat: input.homeLat ?? null,
            lng: input.homeLng ?? null,
          }),
          departure: composePhysicalSpatialTarget({
            label: hub.labelKo,
            resolution: "confirmed",
            lat: hub.lat,
            lng: hub.lng,
            zoneId: `${hub.id}-airport`,
          }),
          return: composePhysicalSpatialTarget({
            label: hub.labelKo,
            resolution: "hypothesis",
            lat: hub.lat,
            lng: hub.lng,
            zoneId: `${hub.id}-airport`,
          }),
        },
      }
    : blueprint.spatialTargets;

  const knownTruth = [
    ...blueprint.resourcePlan.knownTruth.filter(
      (row) => row.slotId !== "departure_hub" && row.slotId !== "origin_location",
    ),
    {
      slotId: "departure_hub",
      value: hub.shortLabelKo,
      source: "user_stated" as const,
      confidence: 0.95,
    },
    {
      slotId: "origin_location",
      value: homeLabel,
      source: "user_stated" as const,
      confidence: 0.9,
    },
  ];

  const emptySlots = blueprint.resourcePlan.emptySlots.filter(
    (slot) => slot !== "departure_hub",
  );
  const destinationLabel =
    blueprint.resourcePlan.knownTruth.find((row) => row.slotId === "destination")?.value ??
    blueprint.constraints.destination?.label ??
    "여행";

  return {
    ...blueprint,
    spatialTargets,
    resourcePlan: {
      ...blueprint.resourcePlan,
      knownTruth,
      emptySlots,
      nextQuestion: {
        slotId: "lodging_place",
        promptKo: `${destinationLabel}에서 묵을 곳을 찾을까요?`,
      },
    },
  };
}

export function advanceRealitySurfaceDepartureHub(input: {
  session: RealitySurfaceSession;
  hub: DepartureHubAirport;
  homeLabel: string;
  homeLat?: number | null;
  homeLng?: number | null;
}): RealitySurfaceSession {
  const blueprint = patchTravelBlueprintForDepartureHub(
    input.session.operatorBlueprint,
    {
      hub: input.hub,
      homeLabel: input.homeLabel,
      homeLat: input.homeLat,
      homeLng: input.homeLng,
    },
  );
  const bridgePathLabels = patchBridgeDepartureLabel(
    input.session.projection.bridge?.pathLabels ?? [],
    input.hub.shortLabelKo,
  );

  return composeRealitySurfaceFromBlueprint({
    eventId: input.session.eventId,
    goalKo: input.session.projection.context?.goalKo ?? blueprint.goal,
    bridgePathLabels,
    blueprint,
    runtimeId: input.session.projection.runtime?.runtimeId ?? blueprint.runtimeId,
    executionPlan: input.session.executionPlan ?? null,
  });
}
