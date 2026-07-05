"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, X } from "lucide-react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { GlobeContextBrainNodeCard } from "@/components/globe/globe-context-brain-node-card";
import { GlobeContextBrainPills } from "@/components/globe/globe-context-brain-pills";
import { ProjectionNodeIcon } from "@/components/globe/projection-node-icon";
import { useContextMediaGuides } from "@/hooks/use-context-media-guides";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import { useGlobeContextBrainActions } from "@/hooks/use-globe-context-brain-actions";
import type { EventCandidate } from "@/lib/events/event-candidate";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
import { queryMediaGuideByGuideNodeId } from "@/lib/ontology/media-guide-store";
import {
  resolveGlobeContextVideoScreenLayout,
  type GlobeContextVideoScreenLayout,
} from "@/lib/globe/resolve-globe-context-video-layout";
import { layoutScreenAnchoredNodeOffsets } from "@/lib/globe/resolve-non-overlapping-callout-offsets";
import { recordPersonaSignal } from "@/lib/persona";
import type { PersonaLearnChoice } from "@/lib/persona/types";
import {
  patchMediaGuidesToProjection,
  patchTravelBrainProjectionAnswer,
} from "@/lib/situation-projection/compose-brain-projection";
import { mindMapNodeCenter } from "@/lib/situation-projection/compute-mind-map-layout";
import { resolveMindMapLayout } from "@/lib/situation-projection/apply-llm-mind-map-layout";
import { buildProjectionNodeExplanation } from "@/lib/situation-projection/projection-node-explanation";
import { resolveProjectionNodeSemantic } from "@/lib/situation-projection/ontology-semantic";
import {
  resolveProjectionNodePresentation,
  type ProjectionPresentationKey,
} from "@/lib/situation-projection/projection-node-presentation";
import {
  buildProjectionSurfaceFilterOptions,
  isProjectionNodeVisibleForSurface,
  type ProjectionSurfaceFilterKey,
} from "@/lib/situation-projection/projection-surface-filter";
import { selectProjectionDisplayManifest } from "@/lib/situation-projection/projection-display-mode";
import { readProjectionManifestForAnchor, subscribeProjectionStore } from "@/lib/situation-projection/projection-store";
import { resolveHubPillTap } from "@/lib/situation-projection/resolve-hub-pill-tap";
import { resolveProjectionNodeTap } from "@/lib/situation-projection/resolve-projection-node-tap";
import type { TravelBrainQuestion } from "@/lib/situation-projection/travel-brain-personalization";
import type {
  GhostProjectionNode,
  HubRunnablePill,
  ProjectionNode,
} from "@/lib/situation-projection/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

const VIEWPORT_PADDING_X = 14;
const VIEWPORT_PADDING_TOP = 18;
const VIEWPORT_PADDING_BOTTOM = 136;
const MIN_GRAPH_WIDTH_PX = 250;
const MAX_GRAPH_WIDTH_PX = 368;
const GRAPH_ANCHOR_GAP_PX = 22;
const MAP_ANCHOR_FRAME_MS = 96;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function openExternalHref(href: string): void {
  const target = href.trim();
  if (!target) {
    return;
  }
  window.open(target, "_blank", "noopener,noreferrer");
}

function findPillForNode(
  node: ProjectionNode,
  pills: readonly HubRunnablePill[],
): HubRunnablePill | null {
  if (node.kind === "ghost") {
    return (
      pills.find((pill) => pill.linkedNodeId === node.id) ??
      pills.find((pill) => pill.ghostAxisId === node.axisId) ??
      null
    );
  }
  return null;
}

function mapLayoutsEqual(
  left: Record<string, GlobeContextVideoScreenLayout>,
  right: Record<string, GlobeContextVideoScreenLayout>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  return leftKeys.every((key) => {
    const a = left[key];
    const b = right[key];
    if (!b) {
      return false;
    }
    return (
      a.x === b.x &&
      a.y === b.y &&
      a.scale === b.scale &&
      a.widthPx === b.widthPx &&
      a.onScreen === b.onScreen
    );
  });
}

function resolveOverlayAccentClasses(
  accent: "green" | "blue" | "orange" | "purple",
) {
  switch (accent) {
    case "green":
      return {
        focusShell: "border-[#6ee7b7]/60 bg-[#10271b]/90 ring-[#34c759]/30",
        mainShell: "border-[#4ade80]/34 bg-[#102117]/76",
        ghostShell: "border-[#34c759]/24 bg-[#0d1912]/56",
        iconWrap: "bg-[#123725] text-[#6ee7b7]",
        category: "text-[#8cf0c7]",
        relation: "text-white/68",
      };
    case "orange":
      return {
        focusShell: "border-[#ffb869]/60 bg-[#2b1a0f]/90 ring-[#ff9500]/30",
        mainShell: "border-[#ffb869]/34 bg-[#26170f]/76",
        ghostShell: "border-[#ff9500]/24 bg-[#19120d]/56",
        iconWrap: "bg-[#3a2612] text-[#ffb869]",
        category: "text-[#ffc98e]",
        relation: "text-white/68",
      };
    case "purple":
      return {
        focusShell: "border-[#d8b4fe]/60 bg-[#23152f]/90 ring-[#bf5af2]/30",
        mainShell: "border-[#d8b4fe]/34 bg-[#201427]/76",
        ghostShell: "border-[#bf5af2]/24 bg-[#151019]/56",
        iconWrap: "bg-[#2d1d3d] text-[#e6ccff]",
        category: "text-[#e6ccff]",
        relation: "text-white/68",
      };
    case "blue":
    default:
      return {
        focusShell: "border-[#7dc1ff]/65 bg-[#0b1f36]/90 ring-[#3182f6]/32",
        mainShell: "border-[#7dc1ff]/36 bg-[#102033]/78",
        ghostShell: "border-[#3182f6]/24 bg-[#0d1724]/58",
        iconWrap: "bg-[#11263d] text-[#8fd1ff]",
        category: "text-[#b6dcff]",
        relation: "text-white/68",
      };
  }
}

function resolveInspectorActionLabel(input: {
  key: ProjectionPresentationKey;
  actionKind: "navigate" | "context_run" | "knowledge_capture" | "coming_soon";
}): string {
  if (input.actionKind === "knowledge_capture") {
    return "여기에 담기";
  }
  if (input.actionKind === "coming_soon") {
    return "곧 연결";
  }
  if (input.actionKind === "navigate") {
    switch (input.key) {
      case "ticket":
        return "티켓 열기";
      case "flight":
        return "항공 열기";
      case "transit":
        return "교통 열기";
      default:
        return "열기";
    }
  }
  switch (input.key) {
    case "lodging":
      return "숙소 보기";
    case "eatery":
      return "맛집 보기";
    case "activity":
      return "갈 곳 보기";
    case "info":
      return "정보 보기";
    case "transit":
      return "교통 보기";
    default:
      return "이어 보기";
  }
}

export type GlobeContextBrainMapOverlayProps = {
  visible: boolean;
  event: EventCandidate | null;
  anchorLat: number | null;
  anchorLng: number | null;
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onProjectionReady?: (eventId: string) => void;
};

export function GlobeContextBrainMapOverlay({
  visible,
  event,
  anchorLat,
  anchorLng,
  globeRef,
  containerRef,
  onClose,
  onProjectionReady,
}: GlobeContextBrainMapOverlayProps) {
  const [projectionRevision, setProjectionRevision] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [anchoredLayouts, setAnchoredLayouts] = useState<
    Record<string, GlobeContextVideoScreenLayout>
  >({});
  const [activeFilter, setActiveFilter] =
    useState<ProjectionSurfaceFilterKey>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { guides } = useContextMediaGuides(event, {
    enabled: visible,
    max: 2,
  });
  const launchedProjectionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return subscribeProjectionStore(() => {
      setProjectionRevision((value) => value + 1);
    });
  }, []);

  const eventId = event?.id?.trim() || null;
  void projectionRevision;
  const manifest = eventId ? readProjectionManifestForAnchor(eventId) : null;
  const projectedGuideIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of manifest?.nodes ?? []) {
      if (
        node.kind === "ghost" &&
        node.candidateOrigin === "media_inferred" &&
        node.sourceGuideNodeId?.trim()
      ) {
        ids.add(node.sourceGuideNodeId.trim());
      }
    }
    return ids;
  }, [manifest?.nodes]);
  const displayMode = "brain_focus" as const;
  const displayManifest = useMemo(
    () =>
      manifest ? selectProjectionDisplayManifest(manifest, displayMode) : null,
    [displayMode, manifest],
  );

  useEffect(() => {
    if (!visible || !event || guides.length === 0) {
      return;
    }
    const nextGuides = guides.filter(
      (guide) => !projectedGuideIds.has(guide.guideNodeId),
    );
    if (nextGuides.length === 0) {
      return;
    }
    patchMediaGuidesToProjection({
      event,
      guides: nextGuides,
      maxGuides: 2,
    });
  }, [event, guides, projectedGuideIds, visible]);
  const travelUi = manifest?.travelBrain?.ui ?? null;
  const travelQuestions = manifest?.travelBrain?.questions ?? [];
  const activeTravelQuestion = travelQuestions[0] ?? null;
  const layout =
    displayManifest && displayManifest.nodes.length > 0
      ? resolveMindMapLayout(displayManifest)
      : null;
  const allowAuxiliary = travelUi?.stage !== "preparing" && activeFilter !== "all";
  const filterOptions = useMemo(
    () => buildProjectionSurfaceFilterOptions(displayManifest?.nodes ?? []),
    [displayManifest?.nodes],
  );
  const nodeById = new Map<string, ProjectionNode>();
  for (const node of displayManifest?.nodes ?? []) {
    nodeById.set(node.id, node);
  }
  const visibleSurfaceNodes = (displayManifest?.nodes ?? []).filter((node) =>
    isProjectionNodeVisibleForSurface({
      node,
      activeFilter,
      allowAuxiliary,
    }),
  );
  const graphNodes = visibleSurfaceNodes.filter((node) => {
    if (node.kind !== "ghost") {
      return true;
    }
    return node.surfacePlacement !== "map_anchor";
  });
  const mapAnchoredNodes = visibleSurfaceNodes.filter(
    (node): node is GhostProjectionNode =>
      node.kind === "ghost" &&
      node.surfacePlacement === "map_anchor" &&
      node.lat != null &&
      node.lng != null,
  );
  const visibleGraphNodeIds = new Set(graphNodes.map((node) => node.id));
  const travelSetupComplete =
    !activeTravelQuestion && (travelUi == null || travelUi.stage === "ready");
  const projectionReady = Boolean(visible && eventId && travelSetupComplete);
  const pills = (manifest?.pills ?? []).filter((pill) => {
    if (travelUi?.stage !== "preparing") {
      return true;
    }
    return pill.actionKind === "knowledge_capture" || pill.emphasis === "focus" || pill.emphasis === "main";
  });
  const mapNodeKey = mapAnchoredNodes.map((node) => node.id).join("|");

  const mapAnchorScreenOffsets = useMemo(() => {
    const boxes = mapAnchoredNodes
      .map((node) => {
        const anchor = anchoredLayouts[node.id];
        if (!anchor) {
          return null;
        }
        const focus = node.emphasis === "focus";
        const main = node.emphasis === "main";
        const width = clamp(
          Math.round(anchor.widthPx * (focus ? 1.06 : main ? 0.98 : 0.9)),
          108,
          196,
        );
        const priority =
          node.emphasis === "focus" ? 100 : node.emphasis === "main" ? 70 : 40;
        return {
          id: node.id,
          x: anchor.x,
          y: anchor.y - 8,
          width,
          height: 72,
          priority,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
    return layoutScreenAnchoredNodeOffsets(boxes);
  }, [anchoredLayouts, mapAnchoredNodes]);

  useEffect(() => {
    if (!visible) {
      setActiveFilter("all");
      setSelectedNodeId(null);
      return;
    }
    setActiveFilter("all");
    setSelectedNodeId(null);
  }, [eventId, visible]);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }
    const stillVisible = visibleSurfaceNodes.some((node) => node.id === selectedNodeId);
    if (!stillVisible) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, visibleSurfaceNodes]);

  useEffect(() => {
    if (activeTravelQuestion) {
      setSelectedNodeId(null);
    }
  }, [activeTravelQuestion]);

  useEffect(() => {
    if (!projectionReady || !eventId) {
      return;
    }
    const launchKey = eventId;
    if (launchedProjectionKeyRef.current === launchKey) {
      return;
    }
    launchedProjectionKeyRef.current = launchKey;
    onProjectionReady?.(eventId);
    onClose();
  }, [eventId, onClose, onProjectionReady, projectionReady]);

  const anchorLayout = useGlobePinScreenAnchor({
    globeRef,
    lat: anchorLat,
    lng: anchorLng,
    enabled: visible && Boolean(event?.id),
    containerRef,
  });

  useEffect(() => {
    if (!visible) {
      return;
    }
    const updateViewport = () => {
      const element = containerRef.current;
      setViewportSize({
        width:
          element?.clientWidth ??
          (typeof window === "undefined" ? 0 : window.innerWidth),
        height:
          element?.clientHeight ??
          (typeof window === "undefined" ? 0 : window.innerHeight),
      });
    };

    updateViewport();

    const element = containerRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && element
        ? new ResizeObserver(() => updateViewport())
        : null;
    if (resizeObserver && element) {
      resizeObserver.observe(element);
    }
    window.addEventListener("resize", updateViewport);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateViewport);
    };
  }, [containerRef, visible]);

  useEffect(() => {
    if (!visible || mapAnchoredNodes.length === 0) {
      return;
    }

    let cancelled = false;
    let lastLayouts: Record<string, GlobeContextVideoScreenLayout> = {};

    const updateAnchors = () => {
      const globe = globeRef.current;
      const container = containerRef.current;
      const viewportWidth = container?.clientWidth ?? window.innerWidth;
      const viewportHeight = container?.clientHeight ?? window.innerHeight;
      const altitude = globe?.getPointOfView()?.altitude ?? null;
      const nextLayouts: Record<string, GlobeContextVideoScreenLayout> = {};
      for (const node of mapAnchoredNodes) {
        const screen = globe?.getScreenCoords(node.lat!, node.lng!) ?? null;
        const next = resolveGlobeContextVideoScreenLayout({
          screen,
          altitude,
          viewportWidth,
          viewportHeight,
        });
        if (next?.onScreen) {
          nextLayouts[node.id] = next;
        }
      }
      if (!cancelled && !mapLayoutsEqual(lastLayouts, nextLayouts)) {
        lastLayouts = nextLayouts;
        setAnchoredLayouts(nextLayouts);
      }
    };

    updateAnchors();
    const intervalId = window.setInterval(updateAnchors, MAP_ANCHOR_FRAME_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [containerRef, globeRef, mapNodeKey, mapAnchoredNodes, visible]);

  const handleActionResult = useGlobeContextBrainActions(event, {
    onActionHandled: (result) => {
      if (result.kind !== "coming_soon") {
        onClose();
      }
    },
  });

  const handlePillTap = useCallback(
    (pill: HubRunnablePill) => {
      if (!event) {
        return;
      }
      handleActionResult(resolveHubPillTap({ pill, event }));
    },
    [event, handleActionResult],
  );

  const handleTravelQuestionChoice = useCallback(
    (question: TravelBrainQuestion, choice: PersonaLearnChoice) => {
      if (!event) {
        return;
      }
      recordPersonaSignal({
        axisId: question.axisId,
        value: choice.value,
        labelKo: choice.labelKo,
        source: "manual",
        eventId: event.id,
      });
      patchTravelBrainProjectionAnswer({
        event,
        question,
        choice,
      });
    },
    [event],
  );
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const selectedPill = selectedNode ? findPillForNode(selectedNode, pills) : null;
  const selectedNodeAction =
    selectedNode && event ? resolveProjectionNodeTap({ node: selectedNode, event }) : null;
  const selectedPillAction =
    selectedPill && event ? resolveHubPillTap({ pill: selectedPill, event }) : null;
  const selectedAction = selectedNodeAction ?? selectedPillAction ?? null;
  const selectedGuide: MediaGuideNode | null =
    selectedNode?.kind === "ghost" && selectedNode.sourceGuideNodeId
      ? guides.find((guide) => guide.guideNodeId === selectedNode.sourceGuideNodeId) ??
        queryMediaGuideByGuideNodeId(selectedNode.sourceGuideNodeId)
      : null;
  const selectedPresentation = selectedNode
    ? resolveProjectionNodePresentation(selectedNode)
    : null;
  const selectedExplanation =
    selectedNode && event
      ? buildProjectionNodeExplanation({
          node: selectedNode,
          manifest,
          event,
        })
      : null;
  const selectedMemoBody = selectedExplanation?.memoKo ?? null;
  const selectedFactors = selectedExplanation?.factorsKo ?? [];
  const selectedActionLabel =
    selectedPresentation && selectedAction
      ? resolveInspectorActionLabel({
          key: selectedPresentation.key,
          actionKind: selectedAction.kind,
        })
      : null;
  const contextTitle =
    event?.place?.trim() || event?.title?.trim() || manifest?.nodes[0]?.label?.trim() || "맥락";
  const handleSelectedAction = useCallback(() => {
    if (selectedNodeAction) {
      handleActionResult(selectedNodeAction);
      return;
    }
    if (selectedPill) {
      handlePillTap(selectedPill);
    }
  }, [handleActionResult, handlePillTap, selectedNodeAction, selectedPill]);
  const handleSelectedMapAction = useCallback(() => {
    if (selectedNode?.kind !== "ghost") {
      return;
    }
    if (selectedNode.mapsUrl?.trim()) {
      openExternalHref(selectedNode.mapsUrl);
      return;
    }
    if (selectedGuide?.canonicalUrl?.trim()) {
      openExternalHref(selectedGuide.canonicalUrl);
    }
  }, [selectedGuide?.canonicalUrl, selectedNode]);

  const graphBox =
    !visible || !layout || !anchorLayout
      ? null
      : (() => {
          const viewportWidth = viewportSize.width;
          const viewportHeight = viewportSize.height;
          if (viewportWidth <= 0 || viewportHeight <= 0) {
            return null;
          }
          const maxWidth = Math.max(
            MIN_GRAPH_WIDTH_PX,
            Math.min(MAX_GRAPH_WIDTH_PX, viewportWidth - VIEWPORT_PADDING_X * 2),
          );
          const width = clamp(
            Math.round(anchorLayout.widthPx * 1.9),
            MIN_GRAPH_WIDTH_PX,
            maxWidth,
          );
          const scale = width / layout.width;
          const height = Math.round(layout.height * scale);
          const left = clamp(
            anchorLayout.x - width / 2,
            VIEWPORT_PADDING_X,
            Math.max(VIEWPORT_PADDING_X, viewportWidth - width - VIEWPORT_PADDING_X),
          );
          const top = clamp(
            anchorLayout.y - height - GRAPH_ANCHOR_GAP_PX,
            VIEWPORT_PADDING_TOP,
            Math.max(
              VIEWPORT_PADDING_TOP,
              viewportHeight - height - VIEWPORT_PADDING_BOTTOM,
            ),
          );
          return { left, top, width, height };
        })();
  const rootLayoutNode =
    layout?.nodes.find((entry) => {
      if (!visibleGraphNodeIds.has(entry.id)) {
        return false;
      }
      const node = nodeById.get(entry.id);
      return node ? resolveProjectionNodeSemantic(node).ontologyRole === "root" : false;
    }) ??
    layout?.nodes[0] ??
    null;
  const rootScreenCenter =
    graphBox && layout && rootLayoutNode
      ? {
          x:
            graphBox.left +
            ((rootLayoutNode.x + rootLayoutNode.width / 2) / layout.width) * graphBox.width,
          y:
            graphBox.top +
            ((rootLayoutNode.y + rootLayoutNode.height / 2) / layout.height) * graphBox.height,
        }
      : anchorLayout
        ? { x: anchorLayout.x, y: anchorLayout.y - GRAPH_ANCHOR_GAP_PX }
        : null;
  const rootNodeId = rootLayoutNode?.id ?? null;
  const questionStripBottom = activeTravelQuestion
    ? "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 1rem)"
    : pills.length > 0
      ? "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 4.6rem)"
      : "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 1.2rem)";
  const filterBottom = activeTravelQuestion
    ? pills.length > 0
      ? "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 9.8rem)"
      : "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 5.2rem)"
    : pills.length > 0
      ? "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 4.6rem)"
      : "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 1.2rem)";
  const inspectorBottom = activeTravelQuestion
    ? pills.length > 0
      ? "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 13.9rem)"
      : "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 9rem)"
    : pills.length > 0
      ? "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 8.2rem)"
      : "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 4.4rem)";
  const showProjectionGraph = !activeTravelQuestion;
  const showBottomInspector = Boolean(selectedNode) && showProjectionGraph;

  if (!visible || !event || !manifest || !displayManifest || !layout || !graphBox) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="pointer-events-none absolute inset-0 z-[24]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        data-globe-context-brain-map-overlay
        data-globe-context-brain-display-mode={displayMode}
      >
        <motion.div
          className={cn(
            "absolute",
            activeTravelQuestion && "pointer-events-none",
          )}
          style={{
            left: graphBox.left,
            top: graphBox.top,
            width: graphBox.width,
            height: graphBox.height,
          }}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
        >
          <div className="absolute inset-[-1.5rem] rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(0,113,227,0.24),transparent_58%)] blur-2xl" />
          {showProjectionGraph ? (
            <>
              <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                className="absolute inset-0 h-full w-full overflow-visible"
                aria-hidden
                data-globe-context-brain-map-links
              >
                {(displayManifest.links ?? []).map((link) => {
                  if (!visibleGraphNodeIds.has(link.fromId) || !visibleGraphNodeIds.has(link.toId)) {
                    return null;
                  }
                  const from = layout.nodes.find((entry) => entry.id === link.fromId);
                  const to = layout.nodes.find((entry) => entry.id === link.toId);
                  if (!from || !to) {
                    return null;
                  }
                  const fromCenter = mindMapNodeCenter(from);
                  const toCenter = mindMapNodeCenter(to);
                  const dashed = link.virtual || link.strokeStyle === "dashed";
                  const selected =
                    selectedNodeId != null &&
                    (link.fromId === selectedNodeId || link.toId === selectedNodeId);
                  const rootLink =
                    rootNodeId != null &&
                    (link.fromId === rootNodeId || link.toId === rootNodeId);
                  return (
                    <line
                      key={link.id}
                      x1={fromCenter.x}
                      y1={fromCenter.y}
                      x2={toCenter.x}
                      y2={toCenter.y}
                      stroke={
                        selected
                          ? "rgba(125,193,255,0.88)"
                          : dashed
                            ? rootLink
                              ? "rgba(255,255,255,0.34)"
                              : "rgba(255,255,255,0.18)"
                            : rootLink
                              ? "rgba(255,255,255,0.26)"
                              : "rgba(255,255,255,0.14)"
                      }
                      strokeWidth={
                        selected
                          ? 2.4
                          : link.weight
                            ? link.weight / 44
                            : dashed
                              ? 1.35
                              : 1.7
                      }
                      strokeDasharray={dashed ? "5 4" : undefined}
                      opacity={selectedNodeId && !selected ? 0.46 : 1}
                    />
                  );
                })}
              </svg>

              <div className="absolute inset-0" data-globe-context-brain-map-nodes>
                {layout.nodes.map((entry) => {
                  const node = nodeById.get(entry.id);
                  if (!node) {
                    return null;
                  }
                  const pill = findPillForNode(node, pills);
                  const nodeAction = resolveProjectionNodeTap({ node, event });
                  const tappable = Boolean(nodeAction || pill);
                  const semantic = resolveProjectionNodeSemantic(node);
                  const presentation = resolveProjectionNodePresentation(node);
                  const accent = resolveOverlayAccentClasses(presentation.discoveryAccent);
                  const root = semantic.ontologyRole === "root";
                  const ghost = node.kind === "ghost";
                  const relationLabel = root ? null : presentation.axisLabelKo;
                  const focus = ghost && node.emphasis === "focus";
                  const main = ghost && node.emphasis === "main";
                  const aux = ghost && node.emphasis === "aux";
                  const mediaCandidate =
                    ghost && node.candidateOrigin === "media_inferred";
                  const selected = selectedNodeId === node.id;
                  if (!visibleGraphNodeIds.has(node.id)) {
                    return null;
                  }
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-pressed={selected}
                      tabIndex={0}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                      }}
                      className={cn(
                        "pointer-events-auto absolute flex flex-col items-start justify-center overflow-hidden rounded-[1rem] px-2.5 py-2 text-left shadow-[0_14px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-transform",
                        tappable && "active:scale-[0.97]",
                        root
                          ? "border border-white/24 bg-[#0b1f36]/84 text-white"
                          : focus
                            ? mediaCandidate
                              ? `border border-dashed ring-1 text-white ${accent.focusShell} opacity-92`
                              : `border ring-1 text-white ${accent.focusShell}`
                            : main
                              ? mediaCandidate
                                ? `border border-dashed text-white ${accent.mainShell} opacity-88`
                                : `border border-dashed text-white ${accent.mainShell}`
                              : ghost
                                ? `border border-dashed text-white/88 ${accent.ghostShell}`
                            : "border border-black/[0.08] bg-white/88 text-[#1d1d1f]",
                        focus && "shadow-[0_18px_40px_rgba(0,113,227,0.3)]",
                        aux && "opacity-80",
                        selected && "ring-2 ring-white/70",
                        !tappable && "cursor-default",
                      )}
                      style={{
                        left: `${(entry.x / layout.width) * 100}%`,
                        top: `${(entry.y / layout.height) * 100}%`,
                        width: `${(entry.width / layout.width) * 100}%`,
                        height: `${(entry.height / layout.height) * 100}%`,
                      }}
                      data-globe-context-brain-map-node={node.id}
                      data-globe-context-brain-map-node-kind={node.kind}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full",
                            root ? "bg-white/12 text-white/78" : accent.iconWrap,
                          )}
                        >
                          <ProjectionNodeIcon token={presentation.iconToken} className="size-3" />
                        </span>
                        <span
                          className={cn(
                            "truncate text-[9px] font-semibold uppercase tracking-[0.08em]",
                            root
                              ? "text-white/58"
                              : focus
                                ? "text-white/82"
                                : accent.category,
                          )}
                        >
                          {presentation.categoryLabelKo}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-1 line-clamp-2 w-full text-[11px] font-semibold leading-tight",
                          root && "text-[12px]",
                          focus && "text-[12px]",
                        )}
                      >
                        {node.label}
                      </span>
                      {relationLabel ? (
                        <span
                          className={cn(
                            "mt-0.5 w-full truncate text-[9px]",
                            root
                              ? "text-white/68"
                              : ghost
                                ? accent.relation
                                : "text-[#6e6e73]",
                          )}
                        >
                          {relationLabel}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="pointer-events-none absolute bottom-[-18px] left-1/2 h-[18px] w-px -translate-x-1/2 bg-white/42" />
              <div className="pointer-events-none absolute bottom-[-24px] left-1/2 size-2 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.65)]" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-5">
              <div className="pointer-events-auto w-full max-w-[14rem] rounded-[1.25rem] border border-white/14 bg-[#0f172a]/76 px-4 py-4 text-white shadow-[0_16px_38px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-[#8fd1ff]">
                    <Brain className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/58">
                      {copy.globe.contextBrainTravelQuestionsEyebrow}
                    </p>
                    <p className="truncate text-[13px] font-semibold text-white">
                      {event.place?.trim() || event.title.trim() || "맥락"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-white/78">
                  {travelUi?.statusKo ?? copy.globe.contextBrainTravelPreparingStatus}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-[#0f172a]/78 text-white shadow-[0_10px_28px_rgba(0,0,0,0.24)] backdrop-blur-xl active:scale-[0.97]"
            aria-label={copy.globe.contextBrainSheetClose}
            data-globe-context-brain-map-close
          >
            <X className="size-4" aria-hidden />
          </button>
        </motion.div>

        {showProjectionGraph && rootScreenCenter && mapAnchoredNodes.length > 0 ? (
          <svg className="pointer-events-none absolute inset-0 z-[24]" aria-hidden>
            {mapAnchoredNodes.map((node) => {
              const anchor = anchoredLayouts[node.id];
              if (!anchor) {
                return null;
              }
              const offset = mapAnchorScreenOffsets[node.id] ?? { dx: 0, dy: 0 };
              const focus = node.emphasis === "focus";
              const selected = selectedNodeId === node.id;
              const cardX = anchor.x + offset.dx;
              const cardY = anchor.y - 8 + offset.dy;
              return (
                <line
                  key={`anchor-link:${node.id}`}
                  x1={rootScreenCenter.x}
                  y1={rootScreenCenter.y}
                  x2={cardX}
                  y2={cardY - Math.max(28, anchor.widthPx * 0.22)}
                  stroke={
                    selected
                      ? "rgba(125,193,255,0.92)"
                      : focus
                        ? "rgba(125,193,255,0.62)"
                        : "rgba(255,255,255,0.24)"
                  }
                  strokeWidth={selected ? 2.6 : focus ? 2 : 1.35}
                  strokeDasharray={focus ? undefined : "5 4"}
                  opacity={selectedNodeId && !selected ? 0.44 : 1}
                />
              );
            })}
          </svg>
        ) : null}

        {showProjectionGraph ? mapAnchoredNodes.map((node) => {
          const anchor = anchoredLayouts[node.id];
          if (!anchor) {
            return null;
          }
          const offset = mapAnchorScreenOffsets[node.id] ?? { dx: 0, dy: 0 };
          const pill = findPillForNode(node, pills);
          const nodeAction = resolveProjectionNodeTap({ node, event });
          const tappable = Boolean(nodeAction || pill);
          const presentation = resolveProjectionNodePresentation(node);
          const accent = resolveOverlayAccentClasses(presentation.discoveryAccent);
          const focus = node.emphasis === "focus";
          const main = node.emphasis === "main";
          const mediaCandidate = node.candidateOrigin === "media_inferred";
          const selected = selectedNodeId === node.id;
          const width = clamp(
            Math.round(anchor.widthPx * (focus ? 1.06 : main ? 0.98 : 0.9)),
            108,
            196,
          );
          return (
            <button
              key={`anchor-node:${node.id}`}
              type="button"
              aria-pressed={selectedNodeId === node.id}
              tabIndex={0}
              onClick={() => {
                setSelectedNodeId(node.id);
              }}
              className={cn(
                "pointer-events-auto absolute z-[25] flex -translate-x-1/2 -translate-y-full flex-col items-start rounded-[1rem] px-3 py-2 text-left text-white shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-transform",
                focus
                  ? mediaCandidate
                    ? `border border-dashed ring-1 ${accent.focusShell} opacity-92`
                    : `border ring-1 ${accent.focusShell}`
                  : main
                    ? mediaCandidate
                      ? `border border-dashed ${accent.mainShell} opacity-88`
                      : `border ${accent.mainShell}`
                    : `border ${accent.ghostShell} opacity-88`,
                selected && "ring-2 ring-white/70",
                tappable && "active:scale-[0.97]",
                !tappable && "cursor-default",
              )}
              style={{
                left: anchor.x + offset.dx,
                top: anchor.y - 8 + offset.dy,
                width,
              }}
              data-globe-context-brain-map-anchor-node={node.id}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    focus ? "bg-white/16 text-white" : accent.iconWrap,
                  )}
                >
                  <ProjectionNodeIcon token={presentation.iconToken} className="size-3" />
                </span>
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-[0.08em]",
                    focus ? "text-white/82" : accent.category,
                  )}
                >
                  {presentation.categoryLabelKo}
                </span>
              </span>
              <span className={cn("mt-1 line-clamp-1 w-full font-semibold leading-tight", focus ? "text-[12px]" : "text-[11px]")}>
                {node.label}
              </span>
              <span className="pointer-events-none absolute left-1/2 top-full h-5 w-px -translate-x-1/2 bg-white/40" />
              <span className="pointer-events-none absolute left-1/2 top-[calc(100%+1.1rem)] size-2 -translate-x-1/2 rounded-full bg-white/82 shadow-[0_0_16px_rgba(255,255,255,0.52)]" />
            </button>
          );
        }) : null}

        {showProjectionGraph && filterOptions.length > 1 ? (
          <motion.div
            className="pointer-events-auto absolute inset-x-0 z-[25] flex justify-center px-3"
            style={{ bottom: filterBottom }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            data-globe-context-brain-filter-strip
          >
            <div className="flex max-w-[min(100%,24rem)] gap-1.5 overflow-x-auto rounded-full bg-[#0f172a]/56 px-2 py-1.5 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveFilter(option.key)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-[0.98]",
                    activeFilter === option.key
                      ? "bg-white text-[#0f172a]"
                      : "bg-white/8 text-white/72 ring-1 ring-white/10",
                  )}
                  data-globe-context-brain-filter={option.key}
                >
                  {option.labelKo}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {showBottomInspector && selectedNode && selectedPresentation ? (
          <motion.div
            className="pointer-events-auto absolute inset-x-0 z-[25] flex justify-center px-3"
            style={{ bottom: inspectorBottom }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            data-globe-context-brain-node-inspector
          >
            <GlobeContextBrainNodeCard
              contextTitle={contextTitle}
              node={selectedNode}
              presentation={selectedPresentation}
              memoBody={selectedMemoBody}
              factors={selectedFactors}
              mediaGuide={selectedGuide}
              primaryAction={
                selectedAction && selectedAction.kind !== "coming_soon" && selectedActionLabel
                  ? {
                      label:
                        selectedGuide?.sourceKind === "youtube"
                          ? copy.globe.contextGuideOpenVideo
                          : selectedActionLabel,
                      onClick: handleSelectedAction,
                    }
                  : null
              }
              secondaryAction={
                selectedNode.kind === "ghost" && selectedNode.mapsUrl?.trim()
                  ? {
                      label: copy.globe.contextBrainNodeMapCta,
                      onClick: handleSelectedMapAction,
                    }
                  : null
              }
              onClose={() => setSelectedNodeId(null)}
            />
          </motion.div>
        ) : null}

        {showProjectionGraph && pills.length > 0 ? (
          <motion.div
            className="pointer-events-auto absolute inset-x-0 z-[25] flex justify-center px-3"
            style={{
              bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.9rem)",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            data-globe-context-brain-map-pill-strip
          >
            <div className="max-w-[min(100%,24rem)] rounded-[1.4rem] bg-[#0f172a]/48 px-1.5 py-1 backdrop-blur-xl">
              <GlobeContextBrainPills
                pills={pills}
                onPillTap={handlePillTap}
                tone="dark"
              />
            </div>
          </motion.div>
        ) : null}
        {activeTravelQuestion ? (
          <motion.div
            className="pointer-events-auto absolute inset-x-0 z-[34] flex justify-center px-3"
            style={{
              bottom: questionStripBottom,
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            data-globe-context-brain-question-strip
          >
            <div className="w-full max-w-[min(100%,24rem)] rounded-[1.25rem] bg-[#0f172a]/74 p-3 text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-white/86">
                  {travelUi?.statusKo ?? copy.globe.contextBrainTravelPreparingStatus}
                </p>
                {travelUi?.questionTotal ? (
                  <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/70">
                    {copy.globe.contextBrainTravelQuestionProgress(
                      travelUi.questionStep,
                      travelUi.questionTotal,
                    )}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/58">
                {copy.globe.contextBrainTravelQuestionsEyebrow}
              </p>
              <p className="mt-1 text-[13px] font-semibold leading-snug text-white">
                {activeTravelQuestion.titleKo}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {activeTravelQuestion.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handleTravelQuestionChoice(activeTravelQuestion, choice)}
                    className="rounded-[0.85rem] bg-white/10 px-2.5 py-2 text-left text-[12px] font-semibold text-white ring-1 ring-white/12 active:scale-[0.98]"
                    data-globe-context-brain-question-choice={choice.id}
                  >
                    {choice.labelKo}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
