"use client";

/**
 * Context Workspace shell — Reality Execution Space (map + Entity Peek).
 * Chat = Agent work log (not SSOT). ADR-022 · Reality OS 4-layer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { approveWorkspacePlaceCheckout } from "@/lib/context-workspace/approve-workspace-place-checkout";
import { setWorkspaceNodeActionReadyState } from "@/lib/context-workspace/set-node-action-ready-state";
import { isWorkspacePlaceAwaitingField } from "@/lib/context-workspace/workspace-place-prepare-status";
import {
  buildBriefReplayStops,
  dispatchWorkspaceBriefReplay,
  subscribeWorkspaceBriefReplayStep,
} from "@/lib/context-workspace/context-brief";
import {
  appendWorkspaceChatTurn,
  clearWorkspaceChat,
} from "@/lib/context-workspace/workspace-chat-store";
import { subscribeContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { subscribePreparedRealityOperations } from "@/lib/reality-queue/prepared-operations-store";
import { MEDIA_SPACETIME_UPDATED } from "@/lib/location-ping/media-context-store";
import {
  EVENT_CANDIDATES_UPDATED,
  findLifeEventCandidate,
} from "@/lib/life-read-model";
import { recoverGlobeContextEventFromPin } from "@/lib/globe/recover-globe-context-event";
import { useActiveContextWeather } from "@/hooks/use-active-context-weather";
import { readWorldState } from "@/lib/workstream/world-state";
import { WorkspaceCommitPreviewSheet } from "@/components/context-workspace/workspace-commit-preview-sheet";
import { WorkspaceCloseNameSheet } from "@/components/context-workspace/workspace-close-name-sheet";
import { WorkspaceCompareSheet } from "@/components/context-workspace/workspace-compare-sheet";
import { enterWorkspaceSlotFocus } from "@/lib/context-workspace/enter-workspace-slot-focus";
import { filterNodesForWorkspaceMapFocus } from "@/lib/context-workspace/workspace-map-focus";
import { resolveWorkspaceFocusNode } from "@/lib/context-workspace/resolve-workspace-focus-node";
import { suggestWorkspaceCapsuleTitle } from "@/lib/context-workspace/suggest-workspace-capsule-title";
import { renameContextEventTitle } from "@/lib/context-workspace/rename-context-event-title";
import {
  subscribeRealityJump,
} from "@/lib/globe/reality-jump";
import { WorkspaceMapView } from "@/components/context-workspace/workspace-map-view";
import { WorkspaceMapMediaEmbed } from "@/components/context-workspace/workspace-map-media-embed";
import { WorkspaceObjectCarousel } from "@/components/context-workspace/workspace-object-carousel";
import { WorkspaceCursorDock } from "@/components/context-workspace/workspace-cursor-dock";
import {
  isWorkspaceContextMediaPinId,
  projectWorkspaceContextMediaPins,
} from "@/lib/context-workspace/project-workspace-context-media-pins";
import { resolveWorkspaceMapCenterFromContext } from "@/lib/context-workspace/stamp-trip-draft-onto-context";
import type { WorkspaceMapPin } from "@/lib/context-workspace/map/workspace-map-provider";
import type { ContextWorkspaceDomain } from "@/lib/context-workspace/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

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
  const [closeNameOpen, setCloseNameOpen] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  /** Place sheet stays closed until an explicit user open (pin / list / jump). */
  const [peekClosed, setPeekClosed] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  /** Invalidates in-flight slot focus so async lookup cannot reopen a closed sheet. */
  const peekOpenGenerationRef = useRef(0);
  /** One Focus map layer — null = itinerary overview */
  const [mapFocusKind, setMapFocusKind] = useState<ContextWorkspaceDomain | null>(
    null,
  );
  const [compareOpen, setCompareOpen] = useState(false);
  const [softRouteDismissed, setSoftRouteDismissed] = useState(false);
  const [softRainDismissed, setSoftRainDismissed] = useState(false);
  const [softQuietDismissed, setSoftQuietDismissed] = useState(false);
  const [prepTick, setPrepTick] = useState(0);
  const [briefReplayGroundIndex, setBriefReplayGroundIndex] = useState<
    number | null
  >(null);
  const [mediaTick, setMediaTick] = useState(0);
  const didAutoMediaFocusRef = useRef(false);

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
    setMapFocusKind(null);
    setFocusedId(null);
    setPeekClosed(true);
    peekOpenGenerationRef.current += 1;
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
        writeContextWorkspaceExpanded(detail.contextEventId, true);
      }
    });
    const unsubPrep = subscribePreparedRealityOperations(() => {
      setPrepTick((n) => n + 1);
    });
    const unsubBriefStep = subscribeWorkspaceBriefReplayStep((detail) => {
      if (detail.contextEventId !== contextEventId?.trim()) return;
      if (detail.done) {
        setBriefReplayGroundIndex(null);
        toast.message(copy.globe.contextBriefReplayDone);
        return;
      }
      setBriefReplayGroundIndex(detail.stepIndex);
      setFocusedId(detail.nodeId);
      // Map focus only — do not force place sheet open during brief replay.
    });
    const unsubJump = subscribeRealityJump((detail) => {
      if (detail.contextEventId !== contextEventId?.trim()) return;
      const live = readContextWorkspace(detail.contextEventId);
      if (!live) return;
      const hit = resolveWorkspaceFocusNode(
        live.nodes,
        detail.placeId,
        detail.title,
      );
      if (!hit) return;
      setFocusedId(hit.id);
      setPeekClosed(false);
      setListOpen(false);
    });
    return () => {
      unsubUpdate();
      unsubOpen();
      unsubExpand();
      unsubPrep();
      unsubBriefStep();
      unsubJump();
    };
  }, [contextEventId, refresh]);

  const visibleNodes = useMemo(
    () => state?.nodes.filter((n) => n.visible) ?? [],
    [state],
  );
  const mapFocusNodes = useMemo(
    () =>
      filterNodesForWorkspaceMapFocus({
        nodes: visibleNodes,
        focusKind: mapFocusKind,
      }),
    [visibleNodes, mapFocusKind],
  );
  const selectedId =
    focusedId ??
    state?.selectedIds[0] ??
    mapFocusNodes.find((n) => n.selected)?.id ??
    null;
  const venueSelectedId = isWorkspaceContextMediaPinId(selectedId)
    ? null
    : selectedId;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setMediaTick((n) => n + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(MEDIA_SPACETIME_UPDATED, bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(MEDIA_SPACETIME_UPDATED, bump);
    };
  }, []);

  const mapPins = useMemo((): WorkspaceMapPin[] => {
    const ctx = contextEventId?.trim() ?? "";
    const venuePins: WorkspaceMapPin[] = mapFocusNodes.map((n) => ({
      id: n.id,
      title: n.title,
      lat: n.lat,
      lng: n.lng,
      rating: n.rating,
      amountLabel: n.amountLabel,
      selected: n.id === venueSelectedId,
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
        n.id === venueSelectedId ? legHintForNode(mapFocusNodes, n.id) : null,
    }));

    const event = ctx
      ? findLifeEventCandidate(ctx) ?? recoverGlobeContextEventFromPin(ctx)
      : null;
    // Media pins only on itinerary overview — avoid clutter in candidate focus.
    const mediaPins =
      mapFocusKind == null
        ? projectWorkspaceContextMediaPins({
            event,
            nodes: mapFocusNodes,
          }).map((pin) => ({
            ...pin,
            selected: pin.id === selectedId,
          }))
        : [];

    return [...venuePins, ...mediaPins];
  }, [
    mapFocusNodes,
    selectedId,
    venueSelectedId,
    contextEventId,
    prepTick,
    mediaTick,
    mapFocusKind,
  ]);

  const selectedMediaPin = useMemo(() => {
    if (!isWorkspaceContextMediaPinId(selectedId)) return null;
    return mapPins.find((p) => p.id === selectedId) ?? null;
  }, [mapPins, selectedId]);

  // Open with captures → focus first media once — but never steal lodging/eatery peek.
  useEffect(() => {
    if (!expanded) {
      didAutoMediaFocusRef.current = false;
      return;
    }
    if (didAutoMediaFocusRef.current) return;
    const hasVenueWork = mapFocusNodes.some(
      (n) =>
        n.kind === "lodging" ||
        n.kind === "eatery" ||
        n.kind === "poi" ||
        n.source === "trip_prep_draft",
    );
    if (hasVenueWork || mapFocusKind != null) {
      didAutoMediaFocusRef.current = true;
      return;
    }
    const firstMedia = mapPins.find((p) => isWorkspaceContextMediaPinId(p.id));
    if (!firstMedia) return;
    didAutoMediaFocusRef.current = true;
    setFocusedId(firstMedia.id);
  }, [expanded, contextEventId, mediaTick, mapPins, mapFocusNodes, mapFocusKind]);

  const selectedAwaitingField = useMemo(() => {
    const ctx = contextEventId?.trim() ?? "";
    const node = visibleNodes.find((n) => n.id === venueSelectedId);
    if (!ctx || !node) return false;
    return isWorkspacePlaceAwaitingField({
      contextEventId: ctx,
      placeId: node.placeId || node.id,
      nodeId: node.id,
    });
  }, [visibleNodes, venueSelectedId, contextEventId, prepTick]);

  const onApprovePay = useCallback(
    async (nodeId: string) => {
      const id = contextEventId?.trim();
      if (!id) return;
      const node =
        readContextWorkspace(id)?.nodes.find((n) => n.id === nodeId) ??
        visibleNodes.find((n) => n.id === nodeId);
      if (!node) return;
      toast.message(copy.globe.workspacePayBusy);
      const result = await approveWorkspacePlaceCheckout({
        contextEventId: id,
        placeId: node.placeId || node.id,
        nodeId: node.id,
        titleKo: node.title,
      });
      setPrepTick((n) => n + 1);
      if (!result.ok) {
        toast.message(result.reasonKo);
        return;
      }
      setWorkspaceNodeActionReadyState({
        contextEventId: id,
        nodeId: node.id,
        state: "committed",
      });
      toast.success(result.toastKo);
    },
    [contextEventId, visibleNodes],
  );

  const onConfirmReady = useCallback(
    (nodeId: string) => {
      const id = contextEventId?.trim();
      if (!id) return;
      const next = setWorkspaceNodeActionReadyState({
        contextEventId: id,
        nodeId,
        state: "approved",
      });
      if (!next) {
        toast.message(copy.globe.workspacePayNeedsPlace);
        return;
      }
      setFocusedId(nodeId);
      setPeekClosed(false);
      toast.success(copy.globe.actionReadyStateApproved);
    },
    [contextEventId],
  );

  const onOpenField = useCallback(
    (nodeId?: string) => {
      const id = nodeId?.trim();
      if (id) {
        void onApprovePay(id);
        return;
      }
      toast.message(copy.globe.workspacePayNeedsPlace);
    },
    [onApprovePay],
  );

  const routeLineCoords = useMemo(() => {
    // Candidate focus — no itinerary spaghetti across hotels.
    if (mapFocusKind != null) return [];
    return buildWorkspaceItineraryLineCoords(mapFocusNodes);
  }, [mapFocusNodes, mapFocusKind]);

  const showSoftRouteChip =
    mapFocusKind == null &&
    !softRouteDismissed &&
    mapFocusNodes.length >= 2 &&
    !(state?.lastChangeKo && /동선|가까운\s*순/.test(state.lastChangeKo));

  const lifeEvent = useMemo(() => {
    const id = contextEventId?.trim() ?? "";
    return id ? findLifeEventCandidate(id) : null;
  }, [contextEventId, state?.updatedAtIso]);
  const weather = useActiveContextWeather({
    event: lifeEvent,
    enabled: expanded && Boolean(contextEventId?.trim()),
  });
  const world = useMemo(() => {
    const id = contextEventId?.trim() ?? "";
    return id ? readWorldState(id) : null;
  }, [contextEventId, state?.updatedAtIso]);
  const tripDraftReady = Boolean(
    state?.nodes.some((n) => n.source === "trip_prep_draft"),
  );
  const preferredMapCenter = useMemo(
    () =>
      resolveWorkspaceMapCenterFromContext({
        realityDraftDestinationKo: state?.realityDraft?.destinationKo,
        query: state?.query,
        projectTitleKo,
        eventPlace: lifeEvent?.place,
        eventTitle: lifeEvent?.title,
        metadata: lifeEvent?.metadata ?? null,
      }),
    [
      state?.realityDraft?.destinationKo,
      state?.query,
      projectTitleKo,
      lifeEvent?.place,
      lifeEvent?.title,
      lifeEvent?.metadata,
    ],
  );
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
        world,
        tripDraftReady,
      }),
    [
      visibleNodes,
      selectedId,
      weather.tempC,
      weather.prepLine,
      world,
      tripDraftReady,
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
      let node =
        readContextWorkspace(id)?.nodes.find((n) => n.id === nodeId) ??
        visibleNodes.find((n) => n.id === nodeId);
      if (!node) {
        return;
      }
      // Continuous book flow — Select gate auto-fills on prepare tap.
      if (!node.selected) {
        applyWorkspaceTransition({
          contextEventId: id,
          op: "select",
          nodeIds: [nodeId],
        });
        node =
          readContextWorkspace(id)?.nodes.find((n) => n.id === nodeId) ?? node;
      }
      const result = prepareWorkspaceNodeBooking({
        contextEventId: id,
        node: { ...node, selected: true },
        contextLabelKo: projectTitleKo ?? state?.query ?? null,
      });
      if (!result.ok) {
        toast.message(result.reasonKo);
        setFocusedId(nodeId);
        setPeekClosed(false);
        return;
      }
      setPrepTick((n) => n + 1);
      setFocusedId(nodeId);
      setPeekClosed(false);
      toast.success(result.toastKo);
      // Stay in Workspace — next tap is human Approve · Pay (Article 0).
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

  const closeNameSuggested = useMemo(() => {
    const id = contextEventId?.trim() ?? "";
    if (!id) {
      return copy.globe.workspaceOpenTitle;
    }
    return suggestWorkspaceCapsuleTitle({
      contextEventId: id,
      workspace: state,
    });
  }, [contextEventId, state, projectTitleKo]);


  const onSelect = useCallback(
    (nodeId: string, titleHint?: string | null) => {
      const id = contextEventId?.trim();
      if (!id) {
        return;
      }

      // Soft focus immediately so chip/peek feels responsive.
      const openGen = ++peekOpenGenerationRef.current;
      setFocusedId(nodeId);
      setListOpen(false);
      setPeekClosed(false);

      if (isWorkspaceContextMediaPinId(nodeId)) {
        setMapFocusKind(null);
        return;
      }

      void (async () => {
        const result = await enterWorkspaceSlotFocus({
          contextEventId: id,
          nodeId,
          titleHint,
        });
        if (openGen !== peekOpenGenerationRef.current) {
          return;
        }
        setMapFocusKind(result.mapFocusKind);
        setFocusedId(result.focusId);
        if (result.replyKo?.trim()) {
          appendWorkspaceChatTurn({
            contextEventId: id,
            role: "assistant",
            text: result.replyKo,
          });
        }
        if (result.mode === "slot_expand" && result.candidateCount > 0) {
          toast.message(result.replyKo ?? copy.globe.workspacePreviewEyebrow);
        }
      })();
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
    setCloseNameOpen(false);
    setExpanded(false);
    writeContextWorkspaceExpanded(id, false);
    if (result.ok) {
      toast.success(copy.globe.workspaceCommitDoneToast, {
        action: {
          label: copy.globe.contextBriefReplayCta,
          onClick: () => {
            const live = readContextWorkspace(id);
            if (!live) return;
            const stops = buildBriefReplayStops(live);
            if (stops.length === 0) return;
            toast.message(copy.globe.contextBriefReplayToast);
            dispatchWorkspaceBriefReplay({
              contextEventId: id,
              nodeIds: stops.map((s) => s.id),
            });
          },
        },
      });
    }
  }, [contextEventId]);

  const collapseWorkspace = useCallback(() => {
    const id = contextEventId?.trim();
    if (!id) {
      return;
    }
    setExpanded(false);
    setCommitPreviewOpen(false);
    setCloseNameOpen(false);
    writeContextWorkspaceExpanded(id, false);
  }, [contextEventId]);

  const onClose = useCallback(() => {
    const id = contextEventId?.trim();
    if (!id) {
      return;
    }
    // Name → Confirm = Capsule Commit (Cursor close / save flow).
    setCloseNameOpen(true);
  }, [contextEventId]);

  const onCloseNameConfirm = useCallback(
    (titleKo: string) => {
      const id = contextEventId?.trim();
      if (!id) {
        return;
      }
      renameContextEventTitle(id, titleKo);
      setCommitBusy(true);
      const result = commitContextWorkspaceToGlobe({ contextEventId: id });
      setCommitBusy(false);
      setCloseNameOpen(false);
      setExpanded(false);
      writeContextWorkspaceExpanded(id, false);
      if (result.ok) {
        toast.success(copy.globe.workspaceCommitDoneToast);
      } else {
        toast.success(copy.globe.workspaceAutoSaveOn);
        collapseWorkspace();
      }
    },
    [collapseWorkspace, contextEventId],
  );

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
    setCloseNameOpen(false);
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
    mapFocusNodes.find((n) => n.id === venueSelectedId) ??
    visibleNodes.find((n) => n.id === venueSelectedId) ??
    null;
  const showPeek =
    selectedNode != null &&
    !peekClosed &&
    selectedMediaPin == null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed inset-0 z-[10150] flex flex-col bg-[#f7f8fa]",
        className,
      )}
      role="dialog"
      aria-label={copy.globe.workspaceOpenTitle}
      aria-modal="true"
      data-context-workspace-open
    >
      {/* Top chrome — hide while place sheet is open so panel can rise (GPT Maps) */}
      {!showPeek ? (
      <header className="relative z-[2] flex shrink-0 items-center gap-2 border-b border-black/[0.04] bg-white/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] text-[#191f28]"
          onClick={onClose}
          aria-label={copy.globe.workspaceCollapse}
        >
          <X className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-[13px] font-bold tracking-tight text-[#191f28]">
            {title}
          </p>
          <p className="truncate text-[10px] tabular-nums text-[#8b95a1]">
            {mapFocusNodes.length}곳 · {progress}%
            {mapFocusKind
              ? ` · ${domainLabelKo(mapFocusKind)}`
              : ""}
            {!mapFocusKind && concierge.topWeatherKo
              ? ` · ${concierge.topWeatherKo.replace(/^현재\s*/u, "")}`
              : ""}
            {!mapFocusKind && concierge.congestionKo
              ? ` · ${concierge.congestionKo.replace(/^전체\s*일정\s*/u, "")}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f4f6] text-[#191f28]"
          onClick={() => setListOpen((v) => !v)}
          aria-label="목록"
          aria-pressed={listOpen}
        >
          <List className="h-4 w-4" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          className="shrink-0 rounded-full bg-[#3182f6] px-2.5 py-2 text-[10px] font-bold text-white disabled:opacity-40"
          onClick={() => setCommitPreviewOpen(true)}
          disabled={
            visibleNodes.length === 0 ||
            (state.selectedIds.length === 0 &&
              !visibleNodes.some((n) => n.selected))
          }
          data-workspace-commit
        >
          {copy.globe.workspaceCommitCta}
        </button>
      </header>
      ) : null}

      {/* Map — sole visual plane; soft hints float on map only */}
      <div className="relative min-h-0 flex-1">
        <WorkspaceMapView
          pins={mapPins}
          selectedId={selectedId}
          onSelectPin={onSelect}
          onPinToggle={onPinToggle}
          onRemovePin={onRemovePin}
          onPrepareReserve={onPrepareReserve}
          onOpenField={onOpenField}
          routeLineCoords={routeLineCoords}
          contextEventId={eventId}
          preferredCenter={preferredMapCenter}
        />
        {selectedMediaPin?.contextMedia ? (
          <WorkspaceMapMediaEmbed
            title={selectedMediaPin.title}
            media={selectedMediaPin.contextMedia}
            onClose={() => setFocusedId(null)}
          />
        ) : null}

        {!showPeek &&
        (showSoftRainChip || showSoftQuietChip || showSoftRouteChip) ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-[2] flex justify-center px-3">
            <div className="pointer-events-auto flex max-w-[min(92vw,360px)] items-center gap-2 rounded-2xl bg-white/96 px-3 py-2 shadow-[0_8px_24px_rgba(25,31,40,0.12)] ring-1 ring-black/[0.04]">
              <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#191f28]">
                {showSoftRainChip
                  ? (concierge.opportunityTitleKo ??
                    copy.globe.workspaceMapSoftRainHint)
                  : showSoftQuietChip
                    ? copy.globe.workspaceMapSoftQuietHint
                    : copy.globe.workspaceMapSoftRouteHint}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-full bg-[#3182f6] px-2.5 py-1 text-[10px] font-extrabold text-white"
                onClick={() => {
                  if (showSoftRainChip) {
                    applyWorkspaceTransition({
                      contextEventId: eventId,
                      op: "simulate",
                      simulateScenarioKo: "비 오면 실내",
                    });
                    setSoftRainDismissed(true);
                    toast.success(copy.globe.workspaceMapSoftRainApply);
                  } else if (showSoftQuietChip) {
                    applyWorkspaceTransition({
                      contextEventId: eventId,
                      op: "simulate",
                      simulateScenarioKo: "덜 붐비는 동선",
                    });
                    setSoftQuietDismissed(true);
                    toast.success(copy.globe.workspaceMapSoftQuietApply);
                  } else {
                    applyWorkspaceTransition({
                      contextEventId: eventId,
                      op: "optimize_route",
                    });
                    setSoftRouteDismissed(true);
                    toast.success(copy.globe.workspaceToolOptimizeRoute);
                  }
                }}
              >
                {copy.globe.workspaceMapSoftQuietApply}
              </button>
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8b95a1]"
                aria-label="닫기"
                onClick={() => {
                  setSoftRainDismissed(true);
                  setSoftQuietDismissed(true);
                  setSoftRouteDismissed(true);
                }}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : null}

        {listOpen ? (
          <div className="pointer-events-auto absolute inset-x-3 top-3 z-[2] max-h-[min(48%,360px)] overflow-hidden rounded-[18px] bg-white shadow-[0_12px_40px_rgba(25,31,40,0.16)] ring-1 ring-black/[0.04]">
            <div className="flex items-center justify-between border-b border-black/[0.04] px-3 py-2">
              <p className="text-[12px] font-bold text-[#191f28]">
                {mapFocusNodes.length}개의{" "}
                {mapFocusKind ? domainLabelKo(mapFocusKind) : kindLabel}
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
              {mapFocusNodes.map((node, index) => (
                <button
                  key={node.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left",
                    selectedId === node.id
                      ? "bg-[#e8f3ff]"
                      : "hover:bg-[#f9fafb]",
                  )}
                  onClick={() => {
                    onSelect(node.id);
                    setListOpen(false);
                  }}
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
                    <span className="block truncate text-[10px] text-[#8b95a1]">
                      ★ {formatRating(node.rating)} · {formatPrice(node)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Agent dock — hide while place sheet / Commit Preview open */}
      {!showPeek && !commitPreviewOpen ? (
        <div className="relative z-[4] shrink-0 bg-gradient-to-t from-[#f7f8fa] via-[#f7f8fa]/95 to-transparent px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          <WorkspaceCursorDock
            contextEventId={eventId}
            onFocusNode={onSelect}
            onBriefReplay={() => {
              setListOpen(false);
              setPeekClosed(true);
            }}
            briefReplayGroundIndex={briefReplayGroundIndex}
            activeDraftNodeId={venueSelectedId}
          />
        </div>
      ) : null}

      {/* Place sheet — fixed over full workspace (status bar inset only, GPT Maps) */}
      {selectedNode && !compareOpen && !commitPreviewOpen ? (
        <WorkspaceObjectCarousel
          open={showPeek}
          contextEventId={eventId}
          nodes={mapFocusNodes}
          activeNodeId={selectedNode.id}
          workspace={state}
          onActiveNodeChange={(nodeId) => {
            setFocusedId(nodeId);
          }}
          onClose={() => {
            peekOpenGenerationRef.current += 1;
            setPeekClosed(true);
          }}
          onOpenCompare={() => setCompareOpen(true)}
          onPrepareReserve={(nodeId) => onPrepareReserve(nodeId)}
          onOpenField={(nodeId) => onOpenField(nodeId)}
          onConfirmReady={(nodeId) => onConfirmReady(nodeId)}
          awaitingField={selectedAwaitingField}
        />
      ) : null}

      {closeNameOpen ? (
        <WorkspaceCloseNameSheet
          suggestedTitleKo={closeNameSuggested}
          busy={commitBusy}
          onConfirm={onCloseNameConfirm}
          onCollapseOnly={(titleKo) => {
            const id = contextEventId?.trim();
            if (id && titleKo.trim()) {
              renameContextEventTitle(id, titleKo.trim());
            }
            collapseWorkspace();
          }}
          onCancel={() => setCloseNameOpen(false)}
        />
      ) : null}

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
          setPeekClosed(false);
        }}
      />
    </div>
  );
}
