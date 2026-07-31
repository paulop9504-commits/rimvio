/**
 * Prepare resources for an intent — card + optional travel Workspace seed.
 * Does not Commit. Driver / used_goods stay shell until live tools fill slots.
 */

import { openLodgingContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import {
  prepareTripWorkspaceDraft,
  shouldPrepareTripWorkspaceDraft,
} from "@/lib/context-workspace/prepare-trip-workspace-draft";
import type { ContextWorkspaceState } from "@/lib/context-workspace/types";
import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { buildWorkspacePrepCard } from "@/lib/workspace-kind/build-workspace-prep-card";
import {
  classifyMarketWorkspaceRole,
  classifyWorkspaceKind,
} from "@/lib/workspace-kind/classify-workspace-kind";
import type { WorkspacePrepCardModel } from "@/lib/workspace-kind/types";

export type PrepareWorkspaceResourcesResult = {
  readonly card: WorkspacePrepCardModel;
  readonly workspace: ContextWorkspaceState | null;
};

/**
 * Intent → prepared resources. UI shows card; CTA calls openWorkspaceFromPrepCard.
 */
export function prepareWorkspaceResources(input: {
  readonly utterance: string;
  readonly contextEventId?: string | null;
  readonly titleOverrideKo?: string | null;
}): PrepareWorkspaceResourcesResult | null {
  const kind = classifyWorkspaceKind(input.utterance);
  if (!kind) {
    return null;
  }

  let workspace: ContextWorkspaceState | null = null;
  const contextEventId = input.contextEventId?.trim() || null;
  const utterance = input.utterance.trim();

  if (kind === "travel" && contextEventId) {
    const dest =
      extractTravelDestination(utterance)?.trim() ||
      input.titleOverrideKo?.trim() ||
      "여행지";
    // Clear trip (오사카 4박5일) → Reality Draft pins first, not empty lodging shell.
    if (shouldPrepareTripWorkspaceDraft(utterance)) {
      workspace = prepareTripWorkspaceDraft({
        utterance,
        contextEventId,
        expand: true,
        skipUserChat: true,
      });
    }
    if (!workspace || workspace.nodes.length === 0) {
      workspace = openLodgingContextWorkspace({
        contextEventId,
        query: `${dest} 숙소`,
        summaryKo: `${dest} 여행 자원 준비`,
        hits: [],
        source: "trip_prep",
      });
    }
  }

  let preparedSlotIds: readonly string[];
  if (kind === "travel") {
    preparedSlotIds = ["hotel", "map", "itinerary"];
  } else if (kind === "used_goods") {
    preparedSlotIds =
      classifyMarketWorkspaceRole(utterance) === "buy"
        ? ["conditions", "price", "sellers"]
        : ["photos", "product", "price", "location"];
  } else {
    preparedSlotIds = ["here", "demand_hot", "call_density"];
  }

  const card = buildWorkspacePrepCard({
    utterance,
    contextEventId: workspace?.contextEventId ?? contextEventId,
    titleOverrideKo: input.titleOverrideKo,
    kind,
    preparedSlotIds,
  });
  if (!card) {
    return null;
  }

  return { card, workspace };
}
