import { findLifeEventCandidate } from "@/lib/life-read-model";
import { buildContextActionInjection } from "@/lib/globe/context-action-injection/build-context-action-injection";
import { publishContextActionInjection } from "@/lib/globe/context-action-injection/context-action-injection-store";
import { readContextConditionPinnedPlaceIds } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import { readActiveScenarioBranch } from "@/lib/globe/experience-simulation/build-experience-scenario";
import { isSimulationTerminalLodgingStop } from "@/lib/globe/experience-simulation/resolve-active-simulation-target";
import type { ExperienceScenario } from "@/lib/globe/experience-simulation/types";

/** Last lodging stop in playback → book handoff injection (L5 precursor). */
export function offerSimulationTerminalBookingInjection(input: {
  scenario: ExperienceScenario;
  cursorIndex: number;
}): boolean {
  if (!isSimulationTerminalLodgingStop(input.scenario, input.cursorIndex)) {
    return false;
  }
  const event = findLifeEventCandidate(input.scenario.contextEventId);
  if (!event) {
    return false;
  }
  const branch = readActiveScenarioBranch(input.scenario);
  const node = branch.nodes[input.cursorIndex];
  if (!node || node.resourceKind !== "lodging") {
    return false;
  }
  const pinned = readContextConditionPinnedPlaceIds(event);
  if (pinned.lodging && pinned.lodging !== node.placeId) {
    return false;
  }
  const injection = buildContextActionInjection({
    event,
    intent: {
      kind: "book_lodging",
      resourceKind: "lodging",
      confidence: 0.95,
    },
  });
  if (!injection) {
    return false;
  }
  publishContextActionInjection(injection);
  return true;
}
