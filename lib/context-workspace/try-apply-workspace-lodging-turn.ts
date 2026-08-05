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
import { runWorkspaceCommandRuntime } from "@/lib/workspace-command";
import { runWorkspaceRealityAgent } from "@/lib/workspace-agent";
import { runRealityPrepare } from "@/lib/prepare-layer";
import { resolveLookupToolId } from "@/lib/rule-engine/resolve-tool-id";
import { invokeRimvioToolAsync } from "@/lib/tool-registry/invoke-rimvio-tool";
import { resolveLodgingStaySearchKeyword } from "@/lib/globe/lodging/lodging-stay-types";
import type { SearchToolCandidate } from "@/lib/graph-command/stamp-search-tool-results-to-diff";
import {
  isContinueWorkUtterance,
  resolveNextWorkAction,
} from "@/lib/workstream/resolve-next-work-action";
import { offerSoftNextWorkAfterAct } from "@/lib/workstream/offer-soft-next-work-after-act";
import { runAgentP1Guards } from "@/lib/agent-policy/run-agent-p1-guards";
import { isCompoundActionUtterance } from "@/lib/action-planner/build-compare-reserve-plan";
import { tryRunContextNlActionAsync } from "@/lib/action-planner/try-run-context-nl-action";
import {
  tryApplyCapabilityUtterance,
} from "@/lib/workspace-capability";
import {
  applyWorkspaceRealityPatch,
  parseWorkspaceRealityPatch,
} from "@/lib/context-workspace/apply-workspace-reality-patch";
import {
  tryApplyNetworkAbsorbWorkspaceTurn,
  type NetworkAbsorbSoftChip,
} from "@/lib/reality-provider/apply-network-absorb-workspace-turn";
import {
  ensureWorkspaceAnchorNode,
  distanceGateNearScout,
  gateNearScoutAnchorAsync,
  DEFAULT_NEAR_RADIUS_METERS,
  type GateNearScoutAnchorResult,
} from "@/lib/context-workspace/reality-anchor";
import { assertWorkspacePostcondition } from "@/lib/context-workspace/assert-workspace-postcondition";
import {
  assertScoutRetryProposal,
  createScoutRetryLock,
  MAX_SCOUT_ATTEMPTS,
  resolveAfterScoutEmpty,
  type ScoutRetryLock,
} from "@/lib/agent-policy/scout-retry-policy";

export type WorkspacePromptTurnResult = {
  handled: boolean;
  replyKo: string | null;
  committed: boolean;
  /** Search added/replaced candidates — pin-bar should show preview + expand. */
  openedForReview?: boolean;
  /** Metro / rail absorb soft chips (map is the answer). */
  softChips?: readonly NetworkAbsorbSoftChip[];
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

  // Slice A — near scout never invents Osaka/Namba without resolved Anchor.
  const nearGate = await gateNearScoutAnchorAsync({
    utterance: input.utterance,
  });
  if (nearGate.gated && !nearGate.ok) {
    return {
      handled: true,
      replyKo: nearGate.statusKo,
      committed: false,
    };
  }
  if (nearGate.gated && nearGate.ok) {
    ensureWorkspaceAnchorNode({
      contextEventId: input.contextEventId,
      anchor: {
        entityId: nearGate.anchor.id,
        titleKo: nearGate.anchor.labelKo,
        labelKo: nearGate.anchor.labelKo,
        kind: nearGate.anchor.kind === "station" ? "station" : "attraction",
        lat: nearGate.anchor.lat,
        lng: nearGate.anchor.lng,
      },
      geoId: nearGate.anchor.id,
      summaryKo: `${nearGate.anchor.labelKo} · 검색 기준점`,
    });
  }

  const p1 = runAgentP1Guards({
    contextEventId: input.contextEventId,
    utterance: input.utterance,
    lat: nearGate.gated && nearGate.ok ? nearGate.anchor.lat : null,
    lng: nearGate.gated && nearGate.ok ? nearGate.anchor.lng : null,
    scoutMode: input.mode === "add" ? "add" : "replace",
  });
  if (!p1.ok) {
    return {
      handled: true,
      replyKo: p1.statusKo,
      committed: false,
    };
  }

  // Target-stack inherit: resolve Spatial from carried near into scout utterance.
  let effectiveNear: GateNearScoutAnchorResult = nearGate;
  if (
    (!nearGate.gated || !nearGate.ok) &&
    p1.carry.inheritedSpatialFromStack &&
    p1.carry.bagForScout.nearLabelKo
  ) {
    effectiveNear = await gateNearScoutAnchorAsync({
      utterance: p1.scoutUtterance,
    });
    if (effectiveNear.gated && effectiveNear.ok) {
      ensureWorkspaceAnchorNode({
        contextEventId: input.contextEventId,
        anchor: {
          entityId: effectiveNear.anchor.id,
          titleKo: effectiveNear.anchor.labelKo,
          labelKo: effectiveNear.anchor.labelKo,
          kind:
            effectiveNear.anchor.kind === "station" ? "station" : "attraction",
          lat: effectiveNear.anchor.lat,
          lng: effectiveNear.anchor.lng,
        },
        geoId: effectiveNear.anchor.id,
        summaryKo: `${effectiveNear.anchor.labelKo} · 검색 기준점`,
      });
    } else if (effectiveNear.gated && !effectiveNear.ok) {
      return {
        handled: true,
        replyKo: effectiveNear.statusKo,
        committed: false,
      };
    }
  }

  // Stale / clear → always replace inventory (never silent refine of old set).
  const effectiveMode =
    p1.forceReplaceScout && input.mode === "add" ? "replace" : input.mode;

  const activeDomain = resolveWorkspaceSearchDomain(
    p1.scoutUtterance,
    state.domain,
  );
  // Near + resolved Anchor → seed ONLY from that Anchor (not old lodging pick).
  const seed =
    effectiveNear.gated && effectiveNear.ok
      ? {
          lat: effectiveNear.anchor.lat,
          lng: effectiveNear.anchor.lng,
          title: effectiveNear.anchor.labelKo,
        }
      : (state.nodes.find(
          (n) =>
            n.source === "reality_anchor" ||
            n.tags.includes("place_locate") ||
            n.tags.includes("reality_anchor") ||
            (typeof n.placeId === "string" &&
              n.placeId.startsWith("geo:jp:osaka:metro:")),
        ) ??
        state.nodes.find(
          (n) => n.selected && (n.kind === "poi" || n.kind === "amenity"),
        ) ??
        state.nodes.find((n) => n.selected) ??
        state.nodes.find((n) => n.bookmarked && n.visible) ??
        state.nodes.find((n) => n.visible) ??
        null);
  const toolDomain = resolveToolDomain(activeDomain);
  const toolId = resolveLookupToolId(toolDomain, p1.scoutUtterance);
  // Fail-Closed: never pass trip summary (Namba/Osaka) as placeName when Anchor is set.
  const areaHint =
    effectiveNear.gated && effectiveNear.ok
      ? effectiveNear.anchor.labelKo
      : state.summaryKo?.replace(/\s*여행.*$/u, "").trim() ||
        state.realityDraft?.destinationKo?.trim() ||
        state.query?.replace(/\s*(숙소|호텔|여행).*$/u, "").trim() ||
        null;
  const stayKw =
    toolDomain === "lodging"
      ? resolveLodgingStaySearchKeyword({
          message: p1.scoutUtterance,
          areaHint,
        })
      : null;
  const query =
    stayKw ||
    p1.scoutUtterance.trim() ||
    state.query ||
    `${domainLabelKo(activeDomain)} 찾기`;

  // T7 — freeze Job + Anchor + query for retry; never Namba trip fallback.
  const scoutLock: ScoutRetryLock | null =
    effectiveNear.gated && effectiveNear.ok
      ? createScoutRetryLock({
          jobId: p1.job.id,
          anchorId: effectiveNear.anchor.id,
          anchorLat: effectiveNear.anchor.lat,
          anchorLng: effectiveNear.anchor.lng,
          nearLabelKo: effectiveNear.anchor.labelKo,
          scoutUtterance: p1.scoutUtterance,
          areaHint: effectiveNear.anchor.labelKo,
        })
      : null;
  const maxScoutAttempts = scoutLock ? MAX_SCOUT_ATTEMPTS : 1;

  try {
    const invokeDomain = toolDomain === "amenity" ? "poi" : toolDomain;
    const patchMeters = (() => {
      const patches = state.patches ?? [];
      for (let i = patches.length - 1; i >= 0; i -= 1) {
        const p = patches[i]?.patch;
        if (
          p &&
          p.kind === "spatial_constraint" &&
          typeof p.meters === "number" &&
          p.meters > 0
        ) {
          return p.meters;
        }
      }
      return null;
    })();

    let candidates: SearchToolCandidate[] = [];
    let distanceStatusKo: string | null = null;
    let toolSummaryKo: string | null = null;

    for (let attempt = 1; attempt <= maxScoutAttempts; attempt += 1) {
      if (scoutLock) {
        const retryGate = assertScoutRetryProposal({
          lock: scoutLock,
          proposed: {
            jobId: p1.job.id,
            anchorId: scoutLock.anchorId,
            scoutUtterance: p1.scoutUtterance,
            areaHint: scoutLock.areaHint,
            lat: seed?.lat ?? scoutLock.anchorLat,
            lng: seed?.lng ?? scoutLock.anchorLng,
          },
        });
        if (!retryGate.ok) {
          return {
            handled: true,
            replyKo: retryGate.statusKo,
            committed: false,
            openedForReview: false,
          };
        }
      }

      const tool = await invokeRimvioToolAsync(toolId, {
        query,
        domain: invokeDomain,
        lat: scoutLock ? scoutLock.anchorLat : seed?.lat,
        lng: scoutLock ? scoutLock.anchorLng : seed?.lng,
        utterance: p1.scoutUtterance,
        contextEventId: input.contextEventId,
        placeName: (scoutLock?.areaHint ?? areaHint) || undefined,
        contextLabelKo: scoutLock?.areaHint ?? areaHint,
      });
      toolSummaryKo = tool.summaryKo?.trim() || null;
      const candidatesRaw = (tool.candidates ?? []).filter((c) => {
        const id = c.id ?? "";
        if (id.startsWith("search:")) return false;
        if (/^(?:eatery|lodging|poi|amenity):osaka:/i.test(id)) return true;
        if (c.source === "seed") return false;
        return true;
      });

      candidates = candidatesRaw;
      distanceStatusKo = null;
      if (
        effectiveNear.gated &&
        effectiveNear.ok &&
        Number.isFinite(effectiveNear.anchor.lat) &&
        Number.isFinite(effectiveNear.anchor.lng)
      ) {
        const gated = distanceGateNearScout({
          anchor: {
            lat: effectiveNear.anchor.lat,
            lng: effectiveNear.anchor.lng,
            labelKo: effectiveNear.anchor.labelKo,
          },
          candidates: candidatesRaw,
          patchMeters,
        });
        candidates = [...gated.kept];
        distanceStatusKo = gated.statusKo;
      }

      if (candidates.length > 0) break;

      if (!scoutLock) {
        break;
      }

      const afterEmpty = resolveAfterScoutEmpty({
        attempt,
        maxAttempts: maxScoutAttempts,
        nearLabelKo: scoutLock.nearLabelKo,
      });
      if (!afterEmpty.retry) {
        return {
          handled: true,
          replyKo: distanceStatusKo ?? afterEmpty.statusKo,
          committed: false,
          openedForReview: false,
        };
      }
    }

    const label = searchDomainLabelKo(activeDomain, input.utterance);
    if (candidates.length === 0) {
      return {
        handled: true,
        replyKo:
          distanceStatusKo ??
          (activeDomain === "eatery"
            ? "근처 맛집을 아직 못 찾았어요 · 동네나 메뉴를 더 말해 주세요"
            : activeDomain === "poi"
              ? "근처 놀거리를 아직 못 찾았어요 · 명소·테마파크처럼 더 말해 주세요"
              : `${label}을 아직 못 찾았어요 · 조건을 짧게 말해 보세요`),
        committed: false,
        openedForReview: false,
      };
    }
    if (effectiveMode === "add") {
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
      const withDistance = distanceStatusKo
        ? `${baseReply} · ${distanceStatusKo}`
        : baseReply;
      if (after) {
        appendWorkspaceSyncedAssistantTurn({
          contextEventId: input.contextEventId,
          state: after,
          textKo: withDistance,
        });
      }
      const soft = offerSoftNextWorkAfterAct({
        contextEventId: input.contextEventId,
        lastAct: "search",
        lastUtterance: input.utterance,
        autoRun: p1.allowSoftNextAuto,
        delayMs: 720,
      });
      return {
        handled: true,
        replyKo: soft.continued && soft.replyKo
          ? `${withDistance}\n${soft.replyKo}`
          : withDistance,
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
        distanceStatusKo ||
        toolSummaryKo ||
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

    // Postcondition — near scout must leave Anchor + in-radius candidates.
    if (effectiveNear.gated && effectiveNear.ok) {
      const candidateKind =
        activeDomain === "eatery"
          ? "eatery"
          : activeDomain === "poi" || activeDomain === "amenity"
            ? "poi"
            : "lodging";
      const pc = assertWorkspacePostcondition({
        state: freshState,
        expect: {
          kind: "near_scout",
          anchorId: effectiveNear.anchor.id,
          anchorLat: effectiveNear.anchor.lat,
          anchorLng: effectiveNear.anchor.lng,
          radiusMeters: DEFAULT_NEAR_RADIUS_METERS,
          candidateKind,
          minCandidates: 1,
        },
      });
      if (!pc.ok) {
        replyKo = `${replyKo} · ${pc.detailKo}`;
      }
    }

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
        autoRun: p1.allowSoftNextAuto,
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

  // ADR-051 — subway/rail absorb before lodging select/scout.
  const networkAbsorb = tryApplyNetworkAbsorbWorkspaceTurn({
    utterance,
    contextEventId,
  });
  if (networkAbsorb?.handled) {
    return {
      handled: true,
      replyKo: networkAbsorb.replyKo,
      committed: false,
      softChips: networkAbsorb.softChips,
    };
  }

  if (!hasProvisionalContextWorkspace(contextEventId)) {
    return { handled: false, replyKo: null, committed: false };
  }

  if (tryApplyCapabilityUtterance({ contextEventId, utterance })) {
    return {
      handled: true,
      replyKo: "작업 도구를 바꿨어요",
      committed: false,
    };
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

  // Reality Prepare Layer — ready_for_commit only (no pay / confirm)
  if (
    /예약\s*준비|호텔.{0,16}준비해|숙소.{0,16}준비해|reservation\s*prepare/iu.test(
      utterance,
    )
  ) {
    const wsState = readContextWorkspace(contextEventId);
    const lodging =
      wsState?.nodes.find((n) => n.selected && n.kind === "lodging") ??
      wsState?.nodes.find((n) => n.kind === "lodging" && n.visible) ??
      null;
    const entityId = lodging?.placeId ?? lodging?.id ?? "";
    if (entityId) {
      const prepared = runRealityPrepare({
        entityId,
        utterance,
        workspaceId: contextEventId,
        action: "reservation_prepare",
        titleHint: lodging?.title ?? null,
        priceLabelKo: lodging?.amountLabel ?? null,
      });
      if (prepared.ok) {
        return {
          handled: true,
          replyKo: prepared.summaryKo,
          committed: false,
        };
      }
      if (prepared.forbidden) {
        return {
          handled: true,
          replyKo: prepared.reasonKo,
          committed: false,
        };
      }
    }
  }

  // Workspace Reality Agent — hotel change / scoped operator (Draft only)
  if (/호텔\s*바꿔|숙소\s*바꿔|다른\s*호텔|호텔\s*변경/iu.test(utterance)) {
    const agent = runWorkspaceRealityAgent({
      workspaceId: contextEventId,
      utterance,
    });
    if (agent.ok) {
      return {
        handled: true,
        replyKo: agent.summaryKo,
        committed: false,
      };
    }
    if (agent.realityCommitAttempted) {
      return {
        handled: true,
        replyKo: agent.reasonKo,
        committed: false,
      };
    }
  }

  // Workspace Command Runtime — propose Draft (Preview → Apply)
  const runtime = runWorkspaceCommandRuntime({
    workspaceId: contextEventId,
    rawText: utterance,
  });
  if (runtime.ok) {
    if (runtime.mode === "proposed" && runtime.proposal) {
      return {
        handled: true,
        replyKo: `미리보기 · ${runtime.proposal.previewKo}\n[적용]하면 Workspace에만 반영돼요 · Reality 원본 유지`,
        committed: false,
      };
    }
    return {
      handled: true,
      replyKo: runtime.summaryKo,
      committed: false,
    };
  }
  if (runtime.forbiddenGlobeMutation) {
    return {
      handled: true,
      replyKo: runtime.reasonKo,
      committed: false,
    };
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

  // ADR-051 — subway/rail absorb before lodging / capability steal.
  const networkAbsorb = tryApplyNetworkAbsorbWorkspaceTurn({
    utterance,
    contextEventId,
  });
  if (networkAbsorb?.handled) {
    return {
      handled: true,
      replyKo: networkAbsorb.replyKo,
      committed: false,
      softChips: networkAbsorb.softChips,
    };
  }

  if (tryApplyCapabilityUtterance({ contextEventId, utterance })) {
    return {
      handled: true,
      replyKo: "작업 도구를 바꿨어요",
      committed: false,
    };
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
