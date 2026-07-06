import { readActiveScenarioBranch } from "@/lib/globe/experience-simulation/build-experience-scenario";
import type { ExperienceScenario } from "@/lib/globe/experience-simulation/types";

export function resolveActiveSimulationNode(
  scenario: ExperienceScenario,
  cursorIndex: number,
): {
  lat: number;
  lng: number;
  title: string;
  placeId: string;
  resourceKind: string;
} | null {
  const branch = readActiveScenarioBranch(scenario);
  if (cursorIndex < 0) {
    return null;
  }
  if (cursorIndex >= branch.nodes.length) {
    const last = branch.nodes.at(-1);
    if (!last) {
      return {
        lat: scenario.anchorLat,
        lng: scenario.anchorLng,
        title: scenario.anchorTitle,
        placeId: "anchor",
        resourceKind: "anchor",
      };
    }
    return last;
  }
  return branch.nodes[cursorIndex] ?? null;
}

export function isSimulationTerminalLodgingStop(
  scenario: ExperienceScenario,
  cursorIndex: number,
): boolean {
  const branch = readActiveScenarioBranch(scenario);
  const node = branch.nodes[cursorIndex];
  if (!node || node.resourceKind !== "lodging") {
    return false;
  }
  const lastLodgingIndex = branch.nodes.reduce(
    (found, row, index) => (row.resourceKind === "lodging" ? index : found),
    -1,
  );
  return cursorIndex === lastLodgingIndex;
}
