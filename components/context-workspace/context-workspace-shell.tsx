"use client";

/**
 * Context Workspace shell — GPT chat over map.
 * Full-bleed map · collapsible chat · bottom prompt. No place card.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { List, X } from "lucide-react";
import { toast } from "sonner";
import {
  applyWorkspaceTransition,
  clearContextWorkspace,
  commitContextWorkspaceToGlobe,
  domainLabelKo,
  estimateWorkspaceProgressPercent,
  readContextWorkspace,
  readContextWorkspaceExpanded,
  subscribeContextWorkspaceOpen,
  subscribeContextWorkspaceUpdated,
  writeContextWorkspaceExpanded,
  type ContextWorkspaceNode,
  type ContextWorkspaceState,
} from "@/lib/context-workspace";
import { buildWorkspaceCommitPreview } from "@/lib/context-workspace/build-commit-preview";
import { buildWorkspaceConciergeStatus } from "@/lib/context-workspace/build-workspace-concierge-status";
import { buildWorkspaceItineraryLineCoords } from "@/lib/context-workspace/map/build-workspace-itinerary-line";
import { prepareWorkspaceNodeBooking } from "@/lib/context-workspace/prepare-workspace-booking";
import { isWorkspacePlaceAwaitingField } from "@/lib/context-workspace/workspace-place-prepare-status";
import {
  appendWorkspaceChatTurn,
  clearWorkspaceChat,
} from "@/lib/context-workspace/workspace-chat-store";
import { subscribeContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { subscribePreparedRealityOperations } from "@/lib/reality-queue/prepared-operations-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { useActiveContextWeather } from "@/hooks/use-active-context-weather";
import { WorkspaceCommitPreviewSheet } from "@/components/context-workspace/workspace-commit-preview-sheet";
import { WorkspaceChatPanel } from "@/components/context-workspace/workspace-chat-panel";
import { WorkspaceCompareSheet } from "@/components/context-workspace/workspace-compare-sheet";
import { WorkspaceMapView } from "@/components/context-workspace/workspace-map-view";
import { WorkspaceNodePeek } from "@/components/context-workspace/workspace-node-peek";
import { WorkspacePromptBar } from "@/components/context-workspace/workspace-prompt-bar";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { openFieldDashboardIngressForced } from "@/lib/nav/field-dashboard-ingress";

export type ContextWorkspaceShellProps = {
  contextEventId: string | null | undefined;
  projectTitleKo?: string | null;
  className?: string;
};

function formatRating(rating: number | null): string {
  if (rating == null || !Number.isFinite(rating)) {
    return "—";
  }
  return rating.toFixed(1);
}

function formatPrice(node: ContextWorkspaceNode): string {
  if (node.amountLabel?.trim()) {
    return node.amountLabel.trim();
  }
  if (node.priceBand != null) {
    return `${"₩".repeat(Math.min(4, Math.max(1, node.priceBand)))}`;
  }
  return "가격 미정";
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function legHintForNode(
  nodes: readonly ContextWorkspaceNode[],
  nodeId: string,
): string | null {
  const idx = nodes.findIndex((n) => n.id === nodeId);
  if (idx <= 0) return null;
  const prev = nodes[idx - 1]!;
  const cur = nodes[idx]!;
  const km = haversineKm(prev, cur);
  if (!Number.isFinite(km) || km <= 0) return null;
  const minutes = Math.max(1, Math.round((km / 4.5) * 60));
  return copy.globe.workspaceMapLegHint(minutes, km);
}

export function ContextWorkspaceShell({
  contextEventId,
  projectTitleKo = null,
  className,
}: ContextWorkspaceShellProps) {
  const [state, setState] = useState<ContextWorkspaceState | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [commitPreviewOpen, setCommitPreviewOpen] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [peekDismissedId, setPeekDismissedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [softRouteDismissed, setSoftRouteDismissed] = useState(false);
  const [softRainDismissed, setSoftRainDismissed] = useState(false);
  const [softQuietDismissed, setSoftQuietDismissed] = useState(false);
  const [prepTick, setPrepTick] = useState(0);

  const refresh = useCallback(() => {
    const id = contextEventId?.trim();
    if (!id) {
      setState(null);
      return;
    }
    const next = readContextWorkspace(id);
    setState(next);
    if (!next || next.status === "closed" || next.status === "committed") {
      setExpanded(false);
      writeContextWorkspaceExpanded(id, false);
    }
  }, [contextEventId]);

  useEffect(() => {
    refresh();
    const id = contextEventId?.trim();
    if (id) {
      const draft = readContextWorkspace(id);
      if (
        draft &&
        (draft.status === "editing" || draft.status === "committing") &&
        readContextWorkspaceExpanded(id)
      ) {
        setExpanded(true);
      }
    }
    const unsubUpdate = subscribeContextWorkspaceUpdated((eventId) => {
      if (eventId === contextEventId?.trim()) {
        refresh();
      }
    });
    const unsubOpen = subscribeContextWorkspaceOpen((detail) => {
      if (detail.contextEventId === contextEventId?.trim()) {
        refresh();
      }
    });
    const unsubExpand = subscribeContextWorkspaceExpand((detail) => {
      if (detail.contextEventId === contextEventId?.trim()) {
        refresh();
        setExpanded(true);
        setChatOpen(true);
        writeContextWorkspaceExpanded(detail.contextEventId, true);
      }
    });
    const unsubPrep = subscribePreparedRealityOperations(() => {
      setPrepTick((n) => n + 1);
    });
    return () => {
      unsubUpdate();
      unsubOpen();
      unsubExpand();
      unsubPrep();
    };
  }, [contextEventId, refresh]);

  const visibleNodes = useMemo(
    () => state?.nodes.filter((n) => n.visible) ?? [],
    [state],
  );
  const selectedId =
    focusedId ??
    state?.selectedIds[0] ??
    visibleNodes.find((n) => n.selected)?.id ??
    null;

  const mapPins = useMemo(() => {
    const ctx = contextEventId?.trim() ?? "";
    return visibleNodes.map((n) => ({
      id: n.id,
      title: n.title,
      lat: n.lat,
      lng: n.lng,
      rating: n.rating,
      amountLabel: n.amountLabel,
      selected: n.id === selectedId,
      bookmarked: n.bookmarked,
      kind: n.kind,
      explicitlySelected: n.selected,
      awaitingField: ctx
        ? isWorkspacePlaceAwaitingField({
            contextEventId: ctx,
            placeId: n.placeId || n.id,
            nodeId: n.id,
          })
        : false,
      photoSpot:
        n.tags.includes("photo_spot") ||
        /포토|사진|photo/i.test(`${n.title} ${n.summaryKo}`),
      legHintKo:
        n.id === selectedId ? legHintForNode(visibleNodes, n.id) : null,
    }));
  }, [visibleNodes, selectedId, contextEventId, prepTick]);

  const selectedAwaitingField = useMemo(() => {
    const ctx = contextEventId?.trim() ?? "";
    const node = visibleNodes.find((n) => n.id === selectedId);
    if (!ctx || !node) return false;
    return isWorkspacePlaceAwaitingField({
      contextEventId: ctx,
      placeId: node.placeId || node.id,
      nodeId: node.id,
    });
  }, [visibleNodes, selectedId, contextEventId, prepTick]);

  const onOpenField = useCallback(
    (_nodeId?: string) => {
      const id = contextEventId?.trim();
      if (!id) return;
      openFieldDashboardIngressForced({
        tab: "queue",
        primaryEventId: id,
      });
    },
    [contextEventId],
  );

  const routeLineCoords = useMemo(
    () => buildWorkspaceItineraryLineCoords(visibleNodes),
    [visibleNodes],
  );

  const showSoftRouteChip =
    !softRouteDismissed &&
    visibleNodes.length >= 2 &&
    !(state?.lastChangeKo && /동선|가까운\s*순/.test(state.lastChangeKo));

  const lifeEvent = useMemo(() => {
    const id = contextEventId?.trim() ?? "";
    return id ? findLifeEventCandidate(id) : null;
  }, [contextEventId, state?.updatedAtIso]);
  const weather = useActiveContextWeather({
    event: lifeEvent,
    enabled: expanded && Boolean(contextEventId?.trim()),
  });
  const concierge = useMemo(
    () =>
      buildWorkspaceConciergeStatus({
        anchorTitle:
          visibleNodes.find((n) => n.id === selectedId)?.title ??
          visibleNodes[0]?.title ??
          null,
        tempC: weather.tempC,
        prepLine: weather.prepLine,
        routeStopCount: visibleNodes.length,
      }),
    [
      visibleNodes,
      selectedId,
      weather.tempC,
      weather.prepLine,
    ],
  );
  const showSoftRainChip =
    !softRainDismissed &&
    concierge.suggestRainRevise &&
    !(state?.lastChangeKo && /비\s*예보|실내\s*위주/.test(state.lastChangeKo));
  const showSoftQuietChip =
    !softQuietDismissed &&
    !showSoftRainChip &&
    concierge.suggestQuietRoute &&
    !(state?.lastChangeKo && /덜\s*붐비/.test(state.lastChangeKo));

  const onPrepareReserve = useCallback(
    (nodeId: string) => {
      const id = contextEventId?.trim();
      if (!id) {
        return;
      }
      const node =
        readContextWorkspace(id)?.nodes.find((n) => n.id === nodeId) ??
        visibleNodes.find((n) => n.id === nodeId);
      if (!node) {
        return;
      }
      if (!node.selected) {
        toast.message(copy.globe.workspacePreviewSelectFirstHint);
        setFocusedId(nodeId);
        setPeekDismissedId(null);
        setChatOpen(false);
        return;
      }
      const result = prepareWorkspaceNodeBooking({
        contextEventId: id,
        node,
        contextLabelKo: projectTitleKo ?? state?.query ?? null,
      });
      if (!result.ok) {
        toast.message(result.reasonKo);
        return;
      }
      setPrepTick((n) => n + 1);
      setFocusedId(nodeId);
      setPeekDismissedId(null);
      setChatOpen(false);
      toast.success(result.toastKo);
    },
    [contextEventId, visibleNodes, projectTitleKo, state?.query],
  );

  const onPinToggle = useCallback(
    (id: string) => {
      const node = visibleNodes.find((n) => n.id === id);
      if (!node) {
        return;
      }
      const eventId = contextEventId?.trim() ?? "";
      applyWorkspaceTransition({
        contextEventId: eventId,
        op: "bookmark",
        nodeIds: [id],
        pin: !node.bookmarked,
      });
      if (!node.bookmarked) {
        toast.success(copy.globe.workspacePinToast(node.title));
      }
    },
    [visibleNodes, contextEventId],
  );

  const onRemovePin = useCallback(
    (id: string) => {
      const eventId = contextEventId?.trim() ?? "";
      applyWorkspaceTransition({
        contextEventId: eventId,
        op: "remove",
        nodeIds: [id],
      });
    },
    [contextEventId],
  );

  const commitPreview = useMemo(
    () => (state ? buildWorkspaceCommitPreview(state) : null),
    [state],
  );

  const onSelect = useCallback(
    (nodeId: string) => {
      const id = contextEventId?.trim();
      if (!id) {
        return;
      }
      // Soft focus only — Preview opens; explicit 「선택」 confirms for prepare/commit.
      setFocusedId(nodeId);
      setListOpen(false);
      setPeekDismissedId(null);
      setChatOpen(false);
      const node = readContextWorkspace(id)?.nodes.find((n) => n.id === nodeId);
      if (node) {
        const why =
          node.summaryKo.trim() ||
          `${domainLabelKo(node.kind)} 후보`;
        appendWorkspaceChatTurn({
          contextEventId: id,
          role: "assistant",
          text: `${copy.globe.workspacePreviewEyebrow} · ${node.title}\n${why}`,
        });
      }
    },
    [contextEventId],
  );

  const runCommit = useCallback(() => {
    const id = contextEventId?.trim();
    if (!id) {
      return;
    }
    setCommitBusy(true);
    const result = commitContextWorkspaceToGlobe({ contextEventId: id });
    setCommitBusy(false);
    setCommitPreviewOpen(false);
    setExpanded(false);
    writeContextWorkspaceExpanded(id, false);
    if (result.ok) {
      toast.success(copy.globe.workspaceCommitDoneToast);
    }
  }, [contextEventId]);

  const onClose = useCallback(() => {
    const id = contextEventId?.trim();
    if (!id) {
      return;
    }
    setExpanded(false);
    setCommitPreviewOpen(false);
    writeContextWorkspaceExpanded(id, false);
  }, [contextEventId]);

  const onDiscard = useCallback(() => {
    const id = contextEventId?.trim();
    if (!id) {
      return;
    }
    applyWorkspaceTransition({ contextEventId: id, op: "close" });
    clearContextWorkspace(id);
    clearWorkspaceChat(id);
    setExpanded(false);
    setCommitPreviewOpen(false);
  }, [contextEventId]);

  if (!expanded || !state || state.status === "closed") {
    return null;
  }

  const kindLabel = domainLabelKo(state.domain);
  const title =
    projectTitleKo?.trim() ||
    state.query.trim() ||
    state.summaryKo.trim() ||
    copy.globe.workspaceOpenTitle;
  const progress = estimateWorkspaceProgressPercent(state);
  const eventId = contextEventId?.trim() ?? "";
  const selectedNode =
    visibleNodes.find((n) => n.id === selectedId) ?? null;
  const showPeek =
    selectedNode != null && peekDismissedId !== selectedNode.id;

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 z-[46] bg-[#f7f8fa]",
        className,
      )}
      role="dialog"
      aria-label={copy.globe.workspaceOpenTitle}
      data-context-workspace-open
    >
      <div className="absolute inset-0">
        <WorkspaceMapView
          pins={mapPins}
          selectedId={selectedId}
          onSelectPin={onSelect}
          onPinToggle={onPinToggle}
          onRemovePin={onRemovePin}
          onPrepareReserve={onPrepareReserve}
          onOpenField={onOpenField}
          routeLineCoords={routeLineCoords}
        />
      </div>

      {(showSoftRainChip || showSoftQuietChip || showSoftRouteChip) ? (
        <div className="pointer-events-none absolute inset-x-0 top-[4.75rem] z-[2] flex flex-col items-center gap-1.5 px-3">
          {showSoftRainChip ? (
            <div className="pointer-events-auto flex max-w-[min(92vw,360px)] items-center gap-1.5 rounded-2xl bg-white/96 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]">
              <p className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-[#191f28]">
                {copy.globe.workspaceMapSoftRainHint}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#3182f6] px-2.5 py-1 text-[10px] font-extrabold text-white"
                data-workspace-soft-rain-apply
                onClick={() => {
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "simulate",
                    simulateScenarioKo: "비 오면 실내",
                  });
                  setSoftRainDismissed(true);
                  toast.success(copy.globe.workspaceMapSoftRainApply);
                }}
              >
                {copy.globe.workspaceMapSoftRainApply}
              </button>
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8b95a1] hover:bg-[#f2f4f6]"
                aria-label="닫기"
                onClick={() => setSoftRainDismissed(true)}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ) : null}
          {showSoftQuietChip ? (
            <div className="pointer-events-auto flex max-w-[min(92vw,360px)] items-center gap-1.5 rounded-2xl bg-white/96 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]">
              <p className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-[#191f28]">
                {copy.globe.workspaceMapSoftQuietHint}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#3182f6] px-2.5 py-1 text-[10px] font-extrabold text-white"
                data-workspace-soft-quiet-apply
                onClick={() => {
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "simulate",
                    simulateScenarioKo: "덜 붐비는 동선",
                  });
                  setSoftQuietDismissed(true);
                  toast.success(copy.globe.workspaceMapSoftQuietApply);
                }}
              >
                {copy.globe.workspaceMapSoftQuietApply}
              </button>
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8b95a1] hover:bg-[#f2f4f6]"
                aria-label="닫기"
                onClick={() => setSoftQuietDismissed(true)}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ) : null}
          {showSoftRouteChip && !showSoftRainChip ? (
            <div className="pointer-events-auto flex max-w-[min(92vw,360px)] items-center gap-1.5 rounded-2xl bg-white/96 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]">
              <p className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-[#191f28]">
                {copy.globe.workspaceMapSoftRouteHint}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#3182f6] px-2.5 py-1 text-[10px] font-extrabold text-white"
                data-workspace-soft-route-apply
                onClick={() => {
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "optimize_route",
                  });
                  setSoftRouteDismissed(true);
                  toast.success(copy.globe.workspaceToolOptimizeRoute);
                }}
              >
                {copy.globe.workspaceMapSoftRouteApply}
              </button>
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8b95a1] hover:bg-[#f2f4f6]"
                aria-label="닫기"
                onClick={() => setSoftRouteDismissed(true)}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#191f28] shadow-[0_2px_12px_rgba(25,31,40,0.12)]"
          onClick={onClose}
          aria-label={copy.globe.workspaceCollapse}
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <div className="pointer-events-auto max-w-[55%] rounded-full bg-white/95 px-3 py-1 shadow-[0_2px_12px_rgba(25,31,40,0.1)]">
          <p className="truncate text-center text-[11px] font-bold tracking-tight text-[#191f28]">
            {title}
          </p>
          <p className="text-center text-[9px] tabular-nums text-[#8b95a1]">
            {concierge.topWeatherKo
              ? concierge.topWeatherKo
              : `${domainLabelKo(state.domain)} · ${visibleNodes.length}곳 · ${progress}%`}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#191f28] shadow-[0_2px_12px_rgba(25,31,40,0.12)]"
            onClick={() => setListOpen((v) => !v)}
            aria-label="목록"
            aria-pressed={listOpen}
          >
            <List className="h-4 w-4" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className="rounded-full bg-[#3182f6] px-2.5 py-1.5 text-[10px] font-bold text-white shadow-[0_2px_12px_rgba(49,130,246,0.35)] disabled:opacity-40"
            onClick={() => setCommitPreviewOpen(true)}
            disabled={
              visibleNodes.length === 0 ||
              (state.selectedIds.length === 0 &&
                !visibleNodes.some((n) => n.selected))
            }
            data-workspace-commit
            title={
              state.selectedIds.length === 0 &&
              !visibleNodes.some((n) => n.selected)
                ? copy.globe.workspacePreviewSelectFirstHint
                : undefined
            }
          >
            {copy.globe.workspaceCommitCta}
          </button>
        </div>
      </div>

      {listOpen ? (
        <div className="pointer-events-auto absolute inset-x-3 top-[5.25rem] z-[3] max-h-[42%] overflow-hidden rounded-[18px] bg-white shadow-[0_12px_40px_rgba(25,31,40,0.16)] ring-1 ring-black/[0.04]">
          <div className="flex items-center justify-between border-b border-black/[0.04] px-3 py-2">
            <p className="text-[12px] font-bold text-[#191f28]">
              {visibleNodes.length}개의 {kindLabel}
            </p>
            <button
              type="button"
              className="text-[11px] font-semibold text-[#8b95a1]"
              onClick={() => setListOpen(false)}
            >
              닫기
            </button>
          </div>
          <div className="max-h-[min(40vh,300px)] space-y-0.5 overflow-y-auto p-1.5">
            {visibleNodes.map((node, index) => (
              <button
                key={node.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left",
                  selectedId === node.id ? "bg-[#e8f3ff]" : "hover:bg-[#f9fafb]",
                )}
                onClick={() => onSelect(node.id)}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    selectedId === node.id
                      ? "bg-[#3182f6] text-white"
                      : "bg-[#f2f4f6] text-[#191f28]",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-bold text-[#191f28]">
                    {node.bookmarked ? "📌 " : ""}
                    {node.title}
                  </span>
                  <span className="block text-[10px] text-[#8b95a1]">
                    ★ {formatRating(node.rating)} · {formatPrice(node)}
                  </span>
                </span>
                {selectedId === node.id ? (
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                      node.bookmarked
                        ? "bg-[#191f28] text-white"
                        : "bg-[#3182f6] text-white",
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      applyWorkspaceTransition({
                        contextEventId: eventId,
                        op: "bookmark",
                        nodeIds: [node.id],
                        pin: !node.bookmarked,
                      });
                      if (!node.bookmarked) {
                        toast.success(copy.globe.workspacePinToast(node.title));
                      }
                    }}
                  >
                    {node.bookmarked
                      ? copy.globe.workspacePinDone
                      : copy.globe.workspacePinCta}
                  </button>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Bottom: peek · chat · slim tools · prompt (pin lives on map markers) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex flex-col gap-1.5 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-20">
        {concierge.bottomLiveKo || visibleNodes.length > 0 ? (
          <div className="pointer-events-none mx-auto max-w-[min(92vw,340px)] rounded-full bg-[#191f28]/88 px-3 py-1 text-center shadow-[0_4px_16px_rgba(25,31,40,0.2)]">
            <p className="truncate text-[10px] font-semibold tracking-tight text-white">
              {concierge.bottomLiveKo ?? copy.globe.workspaceMapLiveFallback}
            </p>
          </div>
        ) : null}
        {showPeek && selectedNode && !compareOpen ? (
          <WorkspaceNodePeek
            contextEventId={eventId}
            node={selectedNode}
            workspace={state}
            onClose={() => setPeekDismissedId(selectedNode.id)}
            onOpenCompare={() => setCompareOpen(true)}
            onPrepareReserve={() => onPrepareReserve(selectedNode.id)}
            onOpenField={() => onOpenField(selectedNode.id)}
            awaitingField={selectedAwaitingField}
            onRecenterItinerary={(nodeId) => {
              applyWorkspaceTransition({
                contextEventId: eventId,
                op: "optimize_route",
                nodeIds: [nodeId],
              });
              toast.success(copy.globe.workspacePreviewRecenter);
            }}
          />
        ) : null}

        <WorkspaceChatPanel
          contextEventId={eventId}
          open={chatOpen}
          onToggle={() => setChatOpen((v) => !v)}
        />

        <div className="pointer-events-auto mx-auto flex max-w-xl gap-1 overflow-x-auto">
          {(
            [
              {
                label: copy.globe.workspaceToolCompare,
                run: () => {
                  const ids =
                    state.compareIds.length >= 2
                      ? state.compareIds
                      : state.selectedIds.length >= 2
                        ? state.selectedIds
                        : focusedId
                          ? [focusedId, ...visibleNodes.map((n) => n.id).filter((id) => id !== focusedId)].slice(0, 2)
                          : visibleNodes.slice(0, 2).map((n) => n.id);
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "compare",
                    nodeIds: ids,
                  });
                  if (ids.length >= 2) setCompareOpen(true);
                },
              },
              {
                label: copy.globe.workspaceToolOptimizeRoute,
                run: () =>
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "optimize_route",
                  }),
              },
            ] as const
          ).map((tool) => (
            <button
              key={tool.label}
              type="button"
              className="shrink-0 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#191f28] shadow-[0_2px_8px_rgba(25,31,40,0.08)]"
              onClick={tool.run}
            >
              {tool.label}
            </button>
          ))}
          <button
            type="button"
            className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-medium text-[#8b95a1]"
            onClick={onDiscard}
          >
            닫기
          </button>
        </div>

        <div className="pointer-events-auto mx-auto w-full max-w-xl">
          <WorkspacePromptBar
            contextEventId={eventId}
            compact
            onTurn={() => setChatOpen(true)}
          />
        </div>
      </div>

      {commitPreviewOpen && commitPreview ? (
        <WorkspaceCommitPreviewSheet
          preview={commitPreview}
          busy={commitBusy}
          onConfirm={runCommit}
          onCancel={() => setCommitPreviewOpen(false)}
        />
      ) : null}

      <WorkspaceCompareSheet
        open={compareOpen}
        contextEventId={eventId}
        workspace={state}
        onClose={() => setCompareOpen(false)}
        onSelect={(nodeId) => {
          setFocusedId(nodeId);
          setPeekDismissedId(null);
        }}
      />
    </div>
  );
}
