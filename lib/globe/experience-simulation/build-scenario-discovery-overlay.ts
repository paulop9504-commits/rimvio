import { GLOBE_TOSS_THEME } from "@/lib/globe/globe-toss-theme";
import type { ContextConditionDiscoveryOverlay } from "@/lib/globe/context-condition-ai/context-condition-discovery-overlay-types";
import type { GlobeTripArc } from "@/lib/globe/project-trip-leg-arcs";
import { readActiveScenarioBranch } from "@/lib/globe/experience-simulation/build-experience-scenario";
import type { ExperienceScenario } from "@/lib/globe/experience-simulation/types";

export function buildScenarioDiscoveryOverlay(input: {
  scenario: ExperienceScenario;
  radiusM: number;
  playbackLegIndex: number;
}): ContextConditionDiscoveryOverlay {
  const branch = readActiveScenarioBranch(input.scenario);
  const chain = [
    {
      id: "anchor",
      lat: input.scenario.anchorLat,
      lng: input.scenario.anchorLng,
    },
    ...branch.nodes.map((node) => ({
      id: node.placeId,
      lat: node.lat,
      lng: node.lng,
    })),
  ];

  const routeArcs: GlobeTripArc[] = [];
  for (let index = 1; index < chain.length; index += 1) {
    const start = chain[index - 1]!;
    const end = chain[index]!;
    const legIndex = index - 1;
    routeArcs.push({
      id: `ctxcond-route:${input.scenario.batchId}:${legIndex}`,
      tripRef: input.scenario.batchId,
      startLat: start.lat,
      startLng: start.lng,
      endLat: end.lat,
      endLng: end.lng,
      color: GLOBE_TOSS_THEME.blue,
      emphasis: legIndex === input.playbackLegIndex ? "focused" : "default",
    });
  }

  return {
    contextEventId: input.scenario.contextEventId,
    batchId: input.scenario.batchId,
    ring: {
      lat: input.scenario.anchorLat,
      lng: input.scenario.anchorLng,
      radiusM: input.radiusM,
    },
    routeArcs,
    playbackLegIndex: input.playbackLegIndex,
    scenarioBranchId: input.scenario.activeBranchId,
  };
}

export function resolvePlaybackLegIndex(
  scenario: ExperienceScenario,
  cursorIndex: number,
): number {
  const branch = readActiveScenarioBranch(scenario);
  return Math.max(0, Math.min(cursorIndex, branch.nodes.length));
}
