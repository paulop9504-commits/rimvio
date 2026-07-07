import { pinContextConditionRecommendation } from "@/lib/globe/context-condition-ai/pin-context-condition-recommendation";
import type { ContextConditionRecommendation } from "@/lib/globe/context-condition-ai/local-discovery-action-types";
import {
  openPalantirCommitAction,
  resolvePalantirCommitAction,
  type PalantirCommitAction,
} from "@/lib/globe/spatial-semantic/resolve-palantir-commit-action";
import { recordPalantirOntologyHistory } from "@/lib/globe/spatial-semantic/palantir-ontology-history-store";
import { readPalantirWorkspaceSnapshot } from "@/lib/globe/spatial-semantic/palantir-workspace-store";

export type PalantirCommitOutcome = {
  readonly action: PalantirCommitAction;
  readonly placeId: string;
};

/** Human commit gate — pin primary place, then open @ action. */
export function executePalantirCommit(input: {
  contextEventId: string;
  recommendation: ContextConditionRecommendation;
  anchorPlaceName: string;
  triggerMessage?: string | null;
  eventDatetime?: string | null;
  openAction?: boolean;
}): PalantirCommitOutcome {
  pinContextConditionRecommendation({
    eventId: input.contextEventId,
    recommendation: input.recommendation,
  });

  const action = resolvePalantirCommitAction({
    recommendation: input.recommendation,
    anchorPlaceName: input.anchorPlaceName,
    triggerMessage: input.triggerMessage,
    eventDatetime: input.eventDatetime,
  });

  if (input.openAction !== false) {
    openPalantirCommitAction(action);
  }

  recordPalantirOntologyHistory({
    contextEventId: input.contextEventId,
    kind: "commit",
    labelKo: action.labelKo,
    workspace: readPalantirWorkspaceSnapshot(input.contextEventId),
  });

  return {
    action,
    placeId: input.recommendation.placeId,
  };
}
