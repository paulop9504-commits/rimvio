/**
 * NL → expand Context Workspace (ADR-022 Preview→Open).
 * Never fall through to Reality ask-gate Q&A for “작업장 띄워”.
 */

import { openLodgingContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { isOpenWorkspaceUtterance } from "@/lib/context-workspace/is-open-workspace-utterance";
import { resumeCapsuleWorkspace } from "@/lib/context-workspace/resume-capsule-workspace";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { offerSoftNextWorkAfterAct } from "@/lib/workstream/offer-soft-next-work-after-act";

export type OpenWorkspaceFromUtteranceResult = {
  readonly ok: boolean;
  readonly replyKo: string;
};

function expandOnly(contextEventId: string): void {
  writeContextWorkspaceExpanded(contextEventId, true);
  dispatchContextWorkspaceExpand({
    contextEventId,
    source: "nl_open",
  });
}

function withSoftNext(
  contextEventId: string,
  utterance: string,
  baseReply: string,
): string {
  const soft = offerSoftNextWorkAfterAct({
    contextEventId,
    lastAct: "open_workspace",
    lastUtterance: utterance,
    autoRun: true,
  });
  if (soft.continued && soft.replyKo) {
    return `${baseReply}\n${soft.replyKo}`;
  }
  if (soft.action?.labelKo) {
    return `${baseReply} · 다음은 「${soft.action.labelKo}」`;
  }
  return baseReply;
}

export function tryOpenWorkspaceFromUtterance(input: {
  readonly contextEventId: string;
  readonly utterance: string;
}): OpenWorkspaceFromUtteranceResult | null {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !isOpenWorkspaceUtterance(utterance)) {
    return null;
  }

  if (hasProvisionalContextWorkspace(contextEventId)) {
    const resumed = resumeCapsuleWorkspace({
      contextEventId,
      utterance,
      expand: true,
    });
    if (resumed) {
      return {
        ok: true,
        replyKo: withSoftNext(contextEventId, utterance, "작업장을 열었어요"),
      };
    }
    const state = readContextWorkspace(contextEventId);
    if (state && state.status !== "closed") {
      expandOnly(contextEventId);
      return {
        ok: true,
        replyKo: withSoftNext(contextEventId, utterance, "작업장을 열었어요"),
      };
    }
  }

  const event = findLifeEventCandidate(contextEventId);
  const meta = event?.metadata as Record<string, unknown> | undefined;
  const dest =
    (typeof meta?.travelDestination === "string"
      ? meta.travelDestination.trim()
      : "") ||
    event?.place?.trim() ||
    event?.title?.trim() ||
    "여행지";
  const cleanedDest = /여행$/u.test(dest) ? dest.replace(/\s*여행$/u, "") : dest;
  const label = cleanedDest || "여행지";

  openLodgingContextWorkspace({
    contextEventId,
    query: `${label} 숙소`,
    summaryKo: `${label} 여행 작업장`,
    hits: [],
    source: "nl_open",
  });
  expandOnly(contextEventId);
  return {
    ok: true,
    replyKo: withSoftNext(contextEventId, utterance, "작업장을 열었어요"),
  };
}
