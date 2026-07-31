/**
 * After lodging candidates land — jump Focus to hotel (realizable booking path).
 * Progressive Reality: reveal hotel slot (ADR-034).
 */

import { copy } from "@/lib/copy/human-ko";
import {
  advanceContextRealityFocus,
  readContextRealityBundle,
  seedContextRealityBundle,
} from "@/lib/reality-os";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { writeContextWorkspaceExpanded } from "@/lib/context-workspace/workspace-store";
import { buildWorkspaceSdkFrame } from "@/lib/workspace-sdk/build-workspace-sdk-frame";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";
import {
  readWorkspaceSdkSession,
  writeWorkspaceSdkSession,
} from "@/lib/workspace-sdk/workspace-sdk-session-store";

export function syncTravelSdkFrameAfterLodgingSeed(input: {
  readonly contextEventId: string;
  readonly candidateCount: number;
  readonly headerTitleKo?: string | null;
}): WorkspaceSdkFrame | null {
  const contextEventId = input.contextEventId.trim();
  if (!contextEventId) {
    return null;
  }
  const prev = readWorkspaceSdkSession(contextEventId);
  const title =
    input.headerTitleKo?.trim() ||
    prev?.header.titleKo ||
    copy.globe.workspacePrepTravelTitle;
  const strip =
    input.candidateCount > 0
      ? copy.globe.workspacePreviewReady(input.candidateCount)
      : copy.globe.workspaceFocusAsk("숙소");

  if (!readContextRealityBundle(contextEventId)) {
    seedContextRealityBundle({
      contextEventId,
      sdkKind: "travel",
      focusSlotId: "hotel",
    });
  } else {
    advanceContextRealityFocus({
      contextEventId,
      completedSlotId: "flight",
      nextSlotId: "hotel",
    });
  }

  const frame = buildWorkspaceSdkFrame({
    kind: "travel",
    headerTitleKo: title,
    contextEventId,
    focusSlotId: "hotel",
    focusLabelKo: "숙소 선택",
    aiStripHintKo: strip,
    lifecycle: "focused",
  });
  writeWorkspaceSdkSession(frame);
  writeContextWorkspaceExpanded(contextEventId, true);
  dispatchContextWorkspaceExpand({
    contextEventId,
    source: "scout_patch",
  });
  return frame;
}

