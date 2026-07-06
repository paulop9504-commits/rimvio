import { copy } from "@/lib/copy/human-ko";
import type { ContextConditionAnchorPinOutcome } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import type {
  ExperienceScenario,
  ExperienceScenarioBranch,
  ExperienceScenarioBranchId,
} from "@/lib/globe/experience-simulation/types";
import { orderScenarioCandidates } from "@/lib/globe/experience-simulation/order-scenario-nodes";
import { scheduleScenarioNodes } from "@/lib/globe/experience-simulation/schedule-scenario-nodes";

const BRANCH_DEFS: readonly {
  id: ExperienceScenarioBranchId;
  mode: ExperienceScenarioBranch["mode"];
  labelKo: string;
}[] = [
  { id: "A", mode: "quick", labelKo: copy.globe.experienceSimBranchQuick },
  { id: "B", mode: "balanced", labelKo: copy.globe.experienceSimBranchBalanced },
  { id: "C", mode: "stay_last", labelKo: copy.globe.experienceSimBranchStayLast },
];

export function buildExperienceScenarioFromOutcome(input: {
  contextEventId: string;
  anchorTitle: string;
  anchorLat: number;
  anchorLng: number;
  outcome: ContextConditionAnchorPinOutcome;
  startAt?: Date;
  activeBranchId?: ExperienceScenarioBranchId;
  cursorIndex?: number;
}): ExperienceScenario | null {
  if (input.outcome.recommendations.length === 0) {
    return null;
  }

  const startAt = input.startAt ?? new Date();
  const anchor = {
    title: input.anchorTitle,
    lat: input.anchorLat,
    lng: input.anchorLng,
  };

  const branches: ExperienceScenarioBranch[] = BRANCH_DEFS.map((def) => {
    const ordered = orderScenarioCandidates({
      mode: def.mode,
      anchorLat: input.anchorLat,
      anchorLng: input.anchorLng,
      recommendations: input.outcome.recommendations,
    });
    return {
      id: def.id,
      labelKo: def.labelKo,
      mode: def.mode,
      nodes: scheduleScenarioNodes({
        anchor,
        ordered,
        startAt,
        cursorIndex:
          def.id === (input.activeBranchId ?? "B") ? input.cursorIndex : 0,
      }),
    };
  });

  return {
    contextEventId: input.contextEventId.trim(),
    batchId: input.outcome.batchId,
    anchorTitle: input.anchorTitle,
    anchorLat: input.anchorLat,
    anchorLng: input.anchorLng,
    branches,
    activeBranchId: input.activeBranchId ?? "B",
    startAtIso: startAt.toISOString(),
  };
}

export function readActiveScenarioBranch(
  scenario: ExperienceScenario,
): ExperienceScenarioBranch {
  return (
    scenario.branches.find((branch) => branch.id === scenario.activeBranchId) ??
    scenario.branches[0]!
  );
}

export function withScenarioBranch(
  scenario: ExperienceScenario,
  branchId: ExperienceScenarioBranchId,
  cursorIndex = 0,
): ExperienceScenario {
  const startAt = new Date(scenario.startAtIso);
  const anchor = {
    title: scenario.anchorTitle,
    lat: scenario.anchorLat,
    lng: scenario.anchorLng,
  };
  const branches = scenario.branches.map((branch) => {
    const ordered = branch.nodes.map((node) => ({
      placeId: node.placeId,
      title: node.title,
      lat: node.lat,
      lng: node.lng,
      resourceKind: node.resourceKind,
      rank: node.rank,
    }));
    return {
      ...branch,
      nodes: scheduleScenarioNodes({
        anchor,
        ordered,
        startAt,
        cursorIndex: branch.id === branchId ? cursorIndex : 0,
      }),
    };
  });
  return { ...scenario, branches, activeBranchId: branchId };
}

export function withScenarioPlaybackCursor(
  scenario: ExperienceScenario,
  cursorIndex: number,
): ExperienceScenario {
  return withScenarioBranch(scenario, scenario.activeBranchId, cursorIndex);
}
