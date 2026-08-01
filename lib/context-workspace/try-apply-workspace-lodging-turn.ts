/**
 * Workspace prompt turn — NL mutates live Workspace (map + list) in realtime.
 */

import {
  applyWorkspaceTransition,
  parseWorkspaceUtteranceTransition,
} from "@/lib/context-workspace/apply-workspace-transition";
import { commitContextWorkspaceToGlobe } from "@/lib/context-workspace/commit-workspace-to-globe";
import {
  hasProvisionalContextWorkspace,
  readContextWorkspace,
  writeContextWorkspace,
  writeContextWorkspaceExpanded,
} from "@/lib/context-workspace/workspace-store";
import { domainLabelKo } from "@/lib/context-workspace/types";
import type { ContextWorkspaceDomain } from "@/lib/context-workspace/types";
import { openMapContextWorkspace } from "@/lib/context-workspace/open-map-workspace";
import { tryOpenWorkspaceFromUtterance } from "@/lib/context-workspace/try-open-workspace-from-utterance";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { appendWorkspaceSyncedAssistantTurn } from "@/lib/context-workspace/build-workspace-chat-sync";
import {
  resolveWorkspaceSearchDomain,
  workspaceDomainToToolDomain,
} from "@/lib/context-workspace/resolve-workspace-search-domain";
import { resolveLookupToolId } from "@/lib/rule-engine/resolve-tool-id";
import { invokeRimvioToolAsync } from "@/lib/tool-registry/invoke-rimvio-tool";
import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import {
  isContinueWorkUtterance,
  resolveNextWorkAction,
} from "@/lib/workstream/resolve-next-work-action";
import { offerSoftNextWorkAfterAct } from "@/lib/workstream/offer-soft-next-work-after-act";
import { isCompoundActionUtterance } from "@/lib/action-planner/build-compare-reserve-plan";
import { tryRunContextNlActionAsync } from "@/lib/action-planner/try-run-context-nl-action";
import {
  applyWorkspaceRealityPatch,
  parseWorkspaceRealityPatch,
} from "@/lib/context-workspace/apply-workspace-reality-patch";

export type WorkspacePromptTurnResult = {
  handled: boolean;
  replyKo: string | null;
  committed: boolean;
  /** Search added/replaced candidates — pin-bar should show preview + expand. */
  openedForReview?: boolean;
};

function resolveToolDomain(
  domain: ContextWorkspaceDomain,
): "lodging" | "eatery" | "poi" | "amenity" {
  return workspaceDomainToToolDomain(domain);
}

function searchDomainLabelKo(
  domain: ContextWorkspaceDomain,
  utterance: string,
): string {
  if (
    domain === "poi" &&
    /놀거리|볼거리|할거리|관광|명소|액티비티/iu.test(utterance)
  ) {
    return "놀거리";
  }
  return domainLabelKo(domain);
}

function expandWorkspaceForReview(contextEventId: string): void {
  writeContextWorkspaceExpanded(contextEventId, true);
  if (typeof window !== "undefined") {
    dispatchContextWorkspaceExpand({
      contextEventId,
      source: "scout_patch",
    });
  }
}

function findNodesByTitleHint(
  contextEventId: string,
  hint: string,
): string[] {
  const state = readContextWorkspace(contextEventId);
  if (!state) {
    return [];
  }
  const q = hint.trim().toLowerCase();
  if (!q) {
    return [];
  }
  return state.nodes
    .filter((n) => n.visible && n.title.toLowerCase().includes(q))
    .map((n) => n.id);
}

function parseSelectByIndex(utterance: string): number | null {
  const text = utterance.trim();
  const ordinal: Record<string, number> = {
    첫: 1,
    일: 1,
    한: 1,
    두: 2,
    둘: 2,
    세: 3,
    셋: 3,
    네: 4,
    넷: 4,
    다섯: 5,
  };
  for (const [key, value] of Object.entries(ordinal)) {
    if (new RegExp(`${key}\\s*(번|번째|째)`, "i").test(text)) {
      return value;
    }
  }
  const m = text.match(/(?:^|\s)(\d+)\s*(?:번|번째|째)?(?:\s|$|로|만|고|을|를)/);
  if (m?.[1] && /선택|골라|고르|보여|자세히|이거|저거|열어|픽|pick|select/i.test(text)) {
    return Number(m[1]);
  }
  if (/^(?:그냥\s*)?(\d+)\s*번(?:만|으로)?$/i.test(text)) {
    const only = text.match(/(\d+)/);
    return only?.[1] ? Number(only[1]) : null;
  }
  return null;
}

function parseKeepTopN(utterance: string): number | null {
  const m = utterance.match(/(?:상위|앞에서|탑|top)\s*(\d+)/i);
  if (m?.[1]) {
    return Number(m[1]);
  }
  const only = utterance.match(/(\d+)\s*곳만|(\d+)\s*개만/);
  if (only) {
    return Number(only[1] ?? only[2]);
  }
  return null;
}

function isRescoutUtterance(text: string): boolean {
  return /찾|추천|보여|다시|다른|더\s*(싸|좋|맛|가성)|근처|주변|바꿔|교체|refresh|search|find/i.test(
    text,
  );
}

function applyParsedWorkspaceTurn(input: {
  contextEventId: string;
  parsed: NonNullable<ReturnType<typeof parseWorkspaceUtteranceTransition>>;
  addCandidates?: readonly SearchToolCandidate[] | null;
  replaceCandidates?: readonly SearchToolCandidate[] | null;
}): WorkspacePromptTurnResult {
  const { contextEventId, parsed } = input;

  if (parsed.op === "commit") {
    const result = commitContextWorkspaceToGlobe({ contextEventId });
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
      replyKo: next?.lastChangeKo ?? "비슷한 곳을 더 넣었어요",
      committed: false,
    };
  }

  if (parsed.op === "replace_candidates") {
    const next = applyWorkspaceTransition({
      contextEventId,
      op: "replace_candidates",
      replaceCandidates: input.replaceCandidates ?? [],
    });
    return {
      handled: true,
      replyKo: next?.lastChangeKo ?? "후보를 바꿨어요",
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

  if (parsed.op === "bookmark") {
    const state = readContextWorkspace(contextEventId);
    const pin = parsed.pin ?? true;
    let targets =
      state?.nodes.filter((n) => n.selected).map((n) => n.id) ?? [];
    if (targets.length === 0) {
      const selectedId = state?.selectedIds[0];
      if (selectedId) {
        targets = [selectedId];
      } else {
        const visible = state?.nodes.filter((n) => n.visible) ?? [];
        if (visible[0]) {
          targets = [visible[0].id];
        }
      }
    }
    if (targets.length === 0) {
      return {
        handled: true,
        replyKo: "고정할 곳을 먼저 골라 주세요",
        committed: false,
      };
    }
    const next = applyWorkspaceTransition({
      contextEventId,
      op: "bookmark",
      nodeIds: targets,
      pin,
    });
    return {
      handled: true,
      replyKo: next?.lastChangeKo ?? (pin ? "고정했어요" : "고정 해제했어요"),
      committed: false,
    };
  }

  if (parsed.op === "compare") {
    const state = readContextWorkspace(contextEventId);
    const ids =
      (state?.selectedIds.length ?? 0) >= 2
        ? state!.selectedIds
        : (state?.nodes.filter((n) => n.visible).slice(0, 2).map((n) => n.id) ??
          []);
    const next = applyWorkspaceTransition({
      contextEventId,
      op: "compare",
      nodeIds: ids,
    });
    return {
      handled: true,
      replyKo: next?.lastChangeKo ?? "비교해 봤어요",
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
    replyKo: next?.lastChangeKo ?? "작업장을 바꿨어요",
    committed: false,
  };
}

async function rescoutWorkspace(input: {
  contextEventId: string;
  utterance: string;
  mode: "replace" | "add";
}): Promise<WorkspacePromptTurnResult> {
  const state = readContextWorkspace(input.contextEventId);
  if (!state) {
    return { handled: false, replyKo: null, committed: false };
  }
  const activeDomain = resolveWorkspaceSearchDomain(
    input.utterance,
    state.domain,
  );
  const seed =
    state.nodes.find((n) => n.selected) ??
    state.nodes.find((n) => n.bookmarked && n.visible) ??
    state.nodes.find((n) => n.visible) ??
    null;
    const toolDomain = resolveToolDomain(activeDomain);
    const toolId = resolveLookupToolId(toolDomain, input.utterance);
    const query =
      input.utterance.trim() ||
      state.query ||
      `${domainLabelKo(activeDomain)} 찾기`;
    try {
      const invokeDomain =
        toolDomain === "amenity" ? "poi" : toolDomain;
      const tool = await invokeRimvioToolAsync(toolId, {
        query,
        domain: invokeDomain,
        lat: seed?.lat,
        lng: seed?.lng,
        utterance: input.utterance,
        contextEventId: input.contextEventId,
        placeName:
          state.summaryKo?.replace(/\s*여행.*$/u, "").trim() ||
          state.query ||
          undefined,
      });
    const candidates = (tool.candidates ?? []).filter((c) => {
      const id = c.id ?? "";
      if (id.startsWith("search:")) return false;
      if (/^(?:eatery|lodging|poi|amenity):osaka:/i.test(id)) return true;
      if (c.source === "seed") return false;
      return true;
    });
    const label = searchDomainLabelKo(activeDomain, input.utterance);
    if (candidates.length === 0) {
      return {
        handled: true,
        replyKo:
          activeDomain === "eatery"
            ? "근처 맛집을 아직 못 찾았어요 · 동네나 메뉴를 더 말해 주세요"
            : activeDomain === "poi"
              ? "근처 놀거리를 아직 못 찾았어요 · 명소·테마파크처럼 더 말해 주세요"
              : `${label}을 아직 못 찾았어요 · 조건을 짧게 말해 보세요`,
        committed: false,
        openedForReview: false,
      };
    }
    if (input.mode === "add") {
      const next = applyWorkspaceTransition({
        contextEventId: input.contextEventId,
        op: "find_similar",
        addCandidates: candidates,
        domain: activeDomain,
        query,
        changeKo:
          candidates.length > 0
            ? `${label} ${candidates.length}곳 더 넣었어요 · 작업장에서 확인`
            : null,
      });
      expandWorkspaceForReview(input.contextEventId);
      const after = readContextWorkspace(input.contextEventId);
      const baseReply =
        next?.lastChangeKo ??
        `${label} ${candidates.length}곳 더 넣었어요 · 작업장에서 확인`;
      if (after) {
        appendWorkspaceSyncedAssistantTurn({
          contextEventId: input.contextEventId,
          state: after,
          textKo: baseReply,
        });
      }
      const soft = offerSoftNextWorkAfterAct({
        contextEventId: input.contextEventId,
        lastAct: "search",
        lastUtterance: input.utterance,
        autoRun: true,
        delayMs: 720,
      });
      return {
        handled: true,
        replyKo: soft.continued && soft.replyKo
          ? `${baseReply}\n${soft.replyKo}`
          : baseReply,
        committed: false,
        openedForReview: true,
      };
    }

    // Replace search → switch active domain; pin cart preserved in openMap.
    const opened = openMapContextWorkspace({
      contextEventId: input.contextEventId,
      domain: activeDomain,
      query,
      summaryKo:
        tool.summaryKo?.trim() ||
        `${label} 후보 ${candidates.length}곳 · 작업장에서 확인`,
      candidates,
      source: "scout_patch",
    });
    const focus =
      opened.nodes.find((n) => !n.bookmarked && n.visible && n.kind === activeDomain) ??
      opened.nodes.find((n) => !n.bookmarked && n.visible) ??
      null;
    if (focus) {
      applyWorkspaceTransition({
        contextEventId: input.contextEventId,
        op: "select",
        nodeIds: [focus.id],
      });
    }
    expandWorkspaceForReview(input.contextEventId);
    const freshState = readContextWorkspace(input.contextEventId) ?? opened;
    const pinned = freshState.nodes.filter((n) => n.bookmarked).length;
    const fresh = freshState.nodes.filter((n) => !n.bookmarked && n.visible).length;
    let replyKo =
      fresh > 0
        ? pinned > 0
          ? `${label} ${fresh}곳 · 고정 ${pinned}곳 유지 · 작업장에서 확인`
          : `${label} 후보 ${fresh}곳 준비했어요 · 작업장에서 확인`
        : `${label}을 아직 못 찾았어요 · 조건을 짧게 말해 보세요`;
    if (fresh > 0) {
      appendWorkspaceSyncedAssistantTurn({
        contextEventId: input.contextEventId,
        state: freshState,
        textKo: replyKo,
      });
      const soft = offerSoftNextWorkAfterAct({
        contextEventId: input.contextEventId,
        lastAct: "search",
        lastUtterance: input.utterance,
        autoRun: true,
        delayMs: 720,
      });
      if (soft.continued && soft.replyKo) {
        replyKo = `${replyKo}\n${soft.replyKo}`;
      }
    }
    return {
      handled: true,
      replyKo,
      committed: false,
      openedForReview: fresh > 0,
    };
  } catch {
    return {
      handled: true,
      replyKo: "지금은 다시 못 찾았어요 · 조건을 짧게 말해 보세요",
      committed: false,
      openedForReview: false,
    };
  }
}

/** Sync soft edits only (no live tool). */
export function tryApplyWorkspaceLodgingTurnSync(input: {
  utterance: string;
  contextEventId: string;
}): WorkspacePromptTurnResult {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) {
    return { handled: false, replyKo: null, committed: false };
  }
  if (!hasProvisionalContextWorkspace(contextEventId)) {
    return { handled: false, replyKo: null, committed: false };
  }

  const index = parseSelectByIndex(utterance);
  if (index != null && index >= 1) {
    const state = readContextWorkspace(contextEventId);
    const visible = state?.nodes.filter((n) => n.visible) ?? [];
    const target = visible[index - 1];
    if (target) {
      const next = applyWorkspaceTransition({
        contextEventId,
        op: "select",
        nodeIds: [target.id],
      });
      return {
        handled: true,
        replyKo: next?.lastChangeKo ?? `${index}번을 골랐어요`,
        committed: false,
      };
    }
  }

  const keepN = parseKeepTopN(utterance);
  if (keepN != null && keepN >= 1) {
    const state = readContextWorkspace(contextEventId);
    const visible = state?.nodes.filter((n) => n.visible) ?? [];
    const keepIds = new Set(visible.slice(0, keepN).map((n) => n.id));
    const removeIds = visible
      .filter((n) => !keepIds.has(n.id) && !n.bookmarked)
      .map((n) => n.id);
    if (removeIds.length > 0) {
      applyWorkspaceTransition({
        contextEventId,
        op: "remove",
        nodeIds: removeIds,
      });
    }
    return {
      handled: true,
      replyKo: `상위 ${keepN}곳만 남겼어요`,
      committed: false,
    };
  }

  const removeName = utterance.match(
    /(.+?)(?:\s*)(빼|삭제|지워|제외|없애)/,
  );
  if (removeName?.[1] && removeName[1].trim().length >= 2) {
    const ids = findNodesByTitleHint(contextEventId, removeName[1]);
    if (ids.length > 0) {
      const next = applyWorkspaceTransition({
        contextEventId,
        op: "remove",
        nodeIds: ids,
      });
      return {
        handled: true,
        replyKo: next?.lastChangeKo ?? "빼 두었어요",
        committed: false,
      };
    }
  }

  const parsed = parseWorkspaceUtteranceTransition(utterance);
  if (!parsed) {
    return { handled: false, replyKo: null, committed: false };
  }
  return applyParsedWorkspaceTurn({ contextEventId, parsed });
}

/** Full prompt path — soft edit, select, or live re-scout. */
export async function tryApplyWorkspaceLodgingTurn(input: {
  utterance: string;
  contextEventId: string;
}): Promise<WorkspacePromptTurnResult> {
  const contextEventId = input.contextEventId.trim();
  const utterance = input.utterance.trim();
  if (!contextEventId || !utterance) {
    return { handled: false, replyKo: null, committed: false };
  }

  const openWs = tryOpenWorkspaceFromUtterance({
    contextEventId,
    utterance,
  });
  if (openWs?.ok) {
    return {
      handled: true,
      replyKo: openWs.replyKo,
      committed: false,
    };
  }

  // ADR-038 — “계속해” reads Work State, not chat history.
  if (isContinueWorkUtterance(utterance)) {
    const next = resolveNextWorkAction({
      contextEventId,
      utterance,
    });
    if (!next.enqueueUtterance) {
      return {
        handled: true,
        replyKo: next.replyKo,
        committed: false,
      };
    }
    if (!hasProvisionalContextWorkspace(contextEventId)) {
      return {
        handled: true,
        replyKo: next.replyKo,
        committed: false,
      };
    }
    const enqueue = next.enqueueUtterance.trim();
    // Never recurse continue into another continue / dead quiz.
    if (
      isContinueWorkUtterance(enqueue) ||
      enqueue === "목적지로 이어서" ||
      enqueue === "4박5일로" ||
      /^목적지로/u.test(enqueue)
    ) {
      const healed = resolveNextWorkAction({ contextEventId });
      const healedEnqueue = healed.enqueueUtterance?.trim() ?? "";
      if (
        !healedEnqueue ||
        isContinueWorkUtterance(healedEnqueue) ||
        healedEnqueue === enqueue
      ) {
        return {
          handled: true,
          replyKo:
            healed.replyKo ||
            "목적·날짜는 반영했어요. 숙소·맛집·동선 중 말해 주세요.",
          committed: false,
        };
      }
      // One-shot soft act only — no nested continue.
      const innerHeal = await tryApplyWorkspaceLodgingTurn({
        utterance: healedEnqueue,
        contextEventId,
      });
      const detail = innerHeal.replyKo?.trim();
      return {
        handled: true,
        replyKo: detail
          ? `${healed.replyKo} ${detail}`.trim()
          : healed.replyKo,
        committed: innerHeal.committed,
      };
    }
    const inner = await tryApplyWorkspaceLodgingTurn({
      utterance: enqueue,
      contextEventId,
    });
    const detail = inner.replyKo?.trim();
    return {
      handled: true,
      replyKo: detail
        ? `${next.replyKo} ${detail}`.trim()
        : next.replyKo,
      committed: inner.committed,
    };
  }

  if (!hasProvisionalContextWorkspace(contextEventId)) {
    return { handled: false, replyKo: null, committed: false };
  }

  // Complex multi-intent — Action Planner / NL pipeline (not first-match filter).
  if (isCompoundActionUtterance(utterance)) {
    const nl = await tryRunContextNlActionAsync({
      utterance,
      contextEventId,
    });
    if (nl?.ok) {
      const replyKo =
        "assistantReplyKo" in nl && typeof nl.assistantReplyKo === "string"
          ? nl.assistantReplyKo
          : "summaryKo" in nl && typeof (nl as { summaryKo?: string }).summaryKo === "string"
            ? (nl as { summaryKo: string }).summaryKo
            : "이렇게 진행할게요";
      expandWorkspaceForReview(contextEventId);
      return {
        handled: true,
        replyKo,
        committed: false,
        openedForReview: true,
      };
    }
  }

  // Reality Patch — NL edits Accommodation Plan (not a user-facing filter).
  {
    const patch = parseWorkspaceRealityPatch(utterance);
    if (patch) {
      const applied = applyWorkspaceRealityPatch({
        contextEventId,
        utterance,
        patch,
      });
      if (applied.handled) {
        expandWorkspaceForReview(contextEventId);
        if (applied.needsRescout && applied.scoutQuery) {
          const scouted = await rescoutWorkspace({
            contextEventId,
            utterance: applied.scoutQuery,
            mode: "replace",
          });
          const after = readContextWorkspace(contextEventId);
          if (after && applied.plan) {
            writeContextWorkspace({
              ...after,
              realityPlan: applied.plan,
              lastChangeKo: applied.replyKo,
            });
          }
          return {
            handled: true,
            replyKo: applied.replyKo,
            committed: scouted.committed,
            openedForReview: true,
          };
        }
        const after = readContextWorkspace(contextEventId);
        if (after) {
          appendWorkspaceSyncedAssistantTurn({
            contextEventId,
            state: after,
            textKo: applied.replyKo ?? "작업을 수정했어요",
          });
        }
        return {
          handled: true,
          replyKo: applied.replyKo,
          committed: false,
          openedForReview: true,
        };
      }
    }
  }

  const parsed = parseWorkspaceUtteranceTransition(utterance);
  if (parsed?.op === "find_similar") {
    return rescoutWorkspace({
      contextEventId,
      utterance,
      mode: "add",
    });
  }

  const sync = tryApplyWorkspaceLodgingTurnSync(input);
  if (sync.handled) {
    return sync;
  }

  if (isRescoutUtterance(utterance)) {
    return rescoutWorkspace({
      contextEventId,
      utterance,
      mode: "replace",
    });
  }

  return {
    handled: false,
    replyKo: null,
    committed: false,
  };
}

/** Alias — prompt bar / shell. */
export const tryApplyWorkspacePromptTurn = tryApplyWorkspaceLodgingTurn;
export const tryApplyWorkspacePromptTurnSync = tryApplyWorkspaceLodgingTurnSync;
