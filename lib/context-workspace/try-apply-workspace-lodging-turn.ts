/**
 * When a provisional lodging Workspace is open, NL mutates Workspace first.
 */

import {
  applyWorkspaceTransition,
  parseWorkspaceUtteranceTransition,
} from "@/lib/context-workspace/apply-workspace-transition";
import { commitLodgingWorkspaceToGlobe } from "@/lib/context-workspace/commit-workspace-to-globe";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
} from "@/lib/context-workspace/workspace-store";
import { invokeRimvioToolAsync } from "@/lib/tool-registry/invoke-rimvio-tool";
import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";

function applyParsedWorkspaceTurn(input: {
  contextEventId: string;
  parsed: NonNullable<ReturnType<typeof parseWorkspaceUtteranceTransition>>;
  addCandidates?: readonly SearchToolCandidate[] | null;
}): {
  handled: boolean;
  replyKo: string | null;
  committed: boolean;
} {
  const { contextEventId, parsed } = input;

  if (parsed.op === "commit") {
    const result = commitLodgingWorkspaceToGlobe({ contextEventId });
    return {
      handled: true,
      replyKo: result.state?.lastChangeKo ?? "지구에 남겼어요",
      committed: result.ok,
    };
  }

  if (parsed.op === "find_similar") {
    const next = applyWorkspaceTransition({
      contextEventId,
      op: "find_similar",
      addCandidates: input.addCandidates ?? [],
    });
    return {
      handled: true,
      replyKo: next?.lastChangeKo ?? "비슷한 숙소를 더 넣었어요",
      committed: false,
    };
  }

  if (parsed.op === "remove") {
    const state = readContextWorkspace(contextEventId);
    let targets =
      state?.nodes.filter((n) => n.selected).map((n) => n.id) ?? [];
    if (targets.length === 0) {
      const visible = state?.nodes.filter((n) => n.visible) ?? [];
      if (visible.length > 0) {
        targets = [visible[visible.length - 1]!.id];
      }
    }
    const next = applyWorkspaceTransition({
      contextEventId,
      op: "remove",
      nodeIds: targets,
    });
    return {
      handled: true,
      replyKo: next?.lastChangeKo ?? "빼 두었어요",
      committed: false,
    };
  }

  const next = applyWorkspaceTransition({
    contextEventId,
    op: parsed.op,
    filter: parsed.filter,
    sortBy: parsed.sortBy,
    simulateScenarioKo: parsed.simulateScenarioKo,
  });
  if (parsed.op === "filter" && parsed.sortBy) {
    applyWorkspaceTransition({
      contextEventId,
      op: "sort",
      sortBy: parsed.sortBy,
    });
  }
  return {
    handled: true,
    replyKo: next?.lastChangeKo ?? "워크스페이스를 바꿨어요",
    committed: false,
  };
}

/** Sync — find_similar uses local clones (no live tool). */
export function tryApplyWorkspaceLodgingTurnSync(input: {
  utterance: string;
  contextEventId: string;
}): {
  handled: boolean;
  replyKo: string | null;
  committed: boolean;
} {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) {
    return { handled: false, replyKo: null, committed: false };
  }
  if (!hasProvisionalContextWorkspace(contextEventId)) {
    return { handled: false, replyKo: null, committed: false };
  }
  const parsed = parseWorkspaceUtteranceTransition(utterance);
  if (!parsed) {
    return { handled: false, replyKo: null, committed: false };
  }
  return applyParsedWorkspaceTurn({ contextEventId, parsed });
}

export async function tryApplyWorkspaceLodgingTurn(input: {
  utterance: string;
  contextEventId: string;
}): Promise<{
  handled: boolean;
  replyKo: string | null;
  committed: boolean;
}> {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) {
    return { handled: false, replyKo: null, committed: false };
  }
  if (!hasProvisionalContextWorkspace(contextEventId)) {
    return { handled: false, replyKo: null, committed: false };
  }

  const parsed = parseWorkspaceUtteranceTransition(utterance);
  if (!parsed) {
    return { handled: false, replyKo: null, committed: false };
  }

  if (parsed.op === "find_similar") {
    const state = readContextWorkspace(contextEventId);
    const seed =
      state?.nodes.find((n) => n.selected) ??
      state?.nodes.find((n) => n.visible) ??
      null;
    const query = seed
      ? `${seed.title} 비슷한 숙소`
      : `${state?.query || "호텔"} 비슷한 숙소`;
    try {
      const tool = await invokeRimvioToolAsync("hotel.lookup", {
        query,
        domain: "lodging",
        lat: seed?.lat,
        lng: seed?.lng,
        utterance,
        contextEventId,
      });
      return applyParsedWorkspaceTurn({
        contextEventId,
        parsed,
        addCandidates: tool.candidates ?? [],
      });
    } catch {
      return applyParsedWorkspaceTurn({ contextEventId, parsed });
    }
  }

  return applyParsedWorkspaceTurn({ contextEventId, parsed });
}
