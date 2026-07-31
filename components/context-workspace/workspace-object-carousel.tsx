"use client";

/**
 * Object browser — layer pills + horizontal snap carousel + detail panel.
 * ChatGPT Maps–style: carousel above Agent; tap card → bottom detail sheet.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, MapPin, Pin, X } from "lucide-react";
import {
  applyWorkspaceTransition,
  type ContextWorkspaceNode,
  type ContextWorkspaceState,
} from "@/lib/context-workspace";
import { buildNodePreview } from "@/lib/context-workspace/build-node-preview";
import { buildNodeContextBrief } from "@/lib/context-workspace/context-brief/build-node-brief";
import { findRealityDraftDayForNode } from "@/lib/context-workspace/reality-draft/build-reality-draft";
import { resolvePeekPrimaryAction } from "@/lib/context-workspace/set-node-action-ready-state";
import { prepareCopyFromCapabilities } from "@/lib/context-workspace/resolve-workspace-node-capabilities";
import { hasRealityExecutionCapability } from "@/lib/reality-object/capabilities-for-type";
import {
  filterNodesByObjectLayer,
  layerLabelKo,
  listPresentObjectLayers,
  resolveWorkspaceObjectLayer,
  type WorkspaceObjectLayerId,
} from "@/lib/context-workspace/workspace-object-layer";
import { offerSoftNextWorkAfterAct } from "@/lib/workstream/offer-soft-next-work-after-act";
import { WorkspaceRemoteImage } from "@/components/context-workspace/workspace-remote-image";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type WorkspaceObjectCarouselProps = {
  open: boolean;
  contextEventId: string;
  nodes: readonly ContextWorkspaceNode[];
  activeNodeId: string | null;
  workspace: Pick<
    ContextWorkspaceState,
    "nodes" | "relationshipEdges" | "compareIds" | "selectedIds" | "realityDraft"
  >;
  dockClearancePx?: number;
  onActiveNodeChange: (nodeId: string) => void;
  onClose: () => void;
  onOpenCompare?: () => void;
  onPrepareReserve?: (nodeId: string) => void;
  onOpenField?: (nodeId: string) => void;
  onConfirmReady?: (nodeId: string) => void;
  awaitingField?: boolean;
};

function layerEmoji(layer: WorkspaceObjectLayerId): string {
  switch (layer) {
    case "hotel":
      return "🏨";
    case "food":
      return "🍜";
    case "play":
      return "🎢";
    case "flight":
      return "✈";
    case "ticket":
      return "🎟";
    default:
      return "📍";
  }
}

export function WorkspaceObjectCarousel({
  open,
  contextEventId,
  nodes,
  activeNodeId,
  workspace,
  dockClearancePx = 72,
  onActiveNodeChange,
  onClose,
  onOpenCompare,
  onPrepareReserve,
  onOpenField,
  onConfirmReady,
  awaitingField = false,
}: WorkspaceObjectCarouselProps) {
  const presentLayers = useMemo(
    () => listPresentObjectLayers(nodes),
    [nodes],
  );

  const activeNode =
    nodes.find((n) => n.id === activeNodeId) ??
    (presentLayers[0]
      ? filterNodesByObjectLayer(nodes, presentLayers[0])[0]
      : null) ??
    null;

  const [layer, setLayer] = useState<WorkspaceObjectLayerId>(() =>
    activeNode
      ? resolveWorkspaceObjectLayer(activeNode)
      : (presentLayers[0] ?? "hotel"),
  );
  const [expanded, setExpanded] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollLockRef = useRef(false);

  const layerNodes = useMemo(
    () => filterNodesByObjectLayer(nodes, layer),
    [nodes, layer],
  );

  // Pin / focus → layer follows
  useEffect(() => {
    if (!activeNode) return;
    const next = resolveWorkspaceObjectLayer(activeNode);
    setLayer((prev) => (prev === next ? prev : next));
  }, [activeNode]);

  // Keep active inside current layer when layer changes via pill
  useEffect(() => {
    if (layerNodes.length === 0) return;
    if (activeNode && resolveWorkspaceObjectLayer(activeNode) === layer) return;
    const first = layerNodes[0];
    if (first) onActiveNodeChange(first.id);
  }, [layer, layerNodes, activeNode, onActiveNodeChange]);

  useEffect(() => {
    setExpanded(false);
    setGalleryIndex(0);
  }, [activeNodeId]);

  useEffect(() => {
    setExpanded(false);
  }, [layer]);

  // Snap carousel to active card
  useLayoutEffect(() => {
    if (!open || expanded || !activeNodeId || !scrollerRef.current) return;
    const el = scrollerRef.current.querySelector<HTMLElement>(
      `[data-carousel-node="${activeNodeId}"]`,
    );
    if (!el) return;
    scrollLockRef.current = true;
    el.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    const t = window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 380);
    return () => window.clearTimeout(t);
  }, [activeNodeId, open, expanded, layer]);

  const onScrollerScroll = useCallback(() => {
    if (scrollLockRef.current || expanded) return;
    const root = scrollerRef.current;
    if (!root) return;
    const mid = root.scrollLeft + root.clientWidth / 2;
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const child of Array.from(root.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const id = child.dataset.carouselNode;
      if (!id) continue;
      const center = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    }
    if (bestId && bestId !== activeNodeId) {
      onActiveNodeChange(bestId);
    }
  }, [activeNodeId, expanded, onActiveNodeChange]);

  const preview = useMemo(
    () => (activeNode ? buildNodePreview(activeNode, workspace) : null),
    [activeNode, workspace],
  );

  const nodeBrief = useMemo(() => {
    if (!activeNode) return null;
    const poiIndex = workspace.nodes
      .filter((n) => n.visible && (n.kind === "poi" || n.kind === "amenity"))
      .findIndex((n) => n.id === activeNode.id);
    const lodging = workspace.nodes.find(
      (n) => n.visible && n.kind === "lodging",
    );
    return buildNodeContextBrief(activeNode, {
      dayIndex: poiIndex >= 0 ? poiIndex : null,
      anchorTitle: lodging?.title ?? null,
    });
  }, [activeNode, workspace]);

  const draftDay = useMemo(() => {
    if (!activeNode || !workspace.realityDraft) return null;
    return findRealityDraftDayForNode(workspace.realityDraft, activeNode.id);
  }, [activeNode, workspace.realityDraft]);

  if (!open || !activeNode || !preview || presentLayers.length === 0) {
    return null;
  }

  const prepareCopy = prepareCopyFromCapabilities(preview.capabilities);
  const primary = resolvePeekPrimaryAction({
    node: activeNode,
    awaitingPrepare: awaitingField,
    prepareLabelKo: prepareCopy.ctaKo,
    prepareHintKo: preview.selected
      ? prepareCopy.hintKo
      : copy.globe.workspacePrepareAutoSelectHint,
    approveLabelKo: copy.globe.workspacePrepareOpenFieldCta,
    approveHintKo: copy.globe.workspacePreparePayFlowHint,
    confirmLabelKo: copy.globe.workspaceConfirmNodeCta,
    confirmHintKo: copy.globe.workspaceConfirmNodeHint,
    doneLabelKo: copy.globe.workspaceNodeDoneCta,
  });

  const images = preview.galleryImages;
  const hero =
    images.length > 0
      ? images[Math.min(galleryIndex, images.length - 1)]!
      : null;
  const compareCount = workspace.compareIds.length;
  const activeLayer = resolveWorkspaceObjectLayer(activeNode);
  const kindLabel = layerLabelKo(activeLayer);

  const confirmSelect = () => {
    applyWorkspaceTransition({
      contextEventId,
      op: "select",
      nodeIds: [activeNode.id],
    });
    const domainCue = hasRealityExecutionCapability(
      preview.capabilities,
      "book_room",
    )
      ? "숙소 선택"
      : hasRealityExecutionCapability(preview.capabilities, "reserve")
        ? "맛집 선택"
        : "선택";
    offerSoftNextWorkAfterAct({
      contextEventId,
      lastAct: "select",
      lastUtterance: domainCue,
      autoRun: true,
      delayMs: 480,
    });
  };

  const addToCompare = () => {
    const nextIds = workspace.compareIds.includes(activeNode.id)
      ? workspace.compareIds
      : [...workspace.compareIds, activeNode.id].slice(0, 5);
    applyWorkspaceTransition({
      contextEventId,
      op: "compare",
      nodeIds: [...nextIds],
    });
    if (nextIds.length >= 2) onOpenCompare?.();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="object-browser"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] flex flex-col items-center"
        style={{
          paddingBottom: `calc(${dockClearancePx}px + env(safe-area-inset-bottom, 0px))`,
        }}
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.85 }}
        data-workspace-object-carousel
      >
        {/* Layer pills — only present layers */}
        <div className="pointer-events-auto mb-2 flex max-w-[min(96vw,420px)] gap-1.5 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {presentLayers.map((id) => {
            const selected = id === layer;
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  selected
                    ? "bg-[#191f28] text-white shadow-[0_4px_12px_rgba(25,31,40,0.2)]"
                    : "bg-white/95 text-[#4e5968] shadow-[0_2px_10px_rgba(25,31,40,0.08)] ring-1 ring-black/[0.04]",
                )}
                onClick={() => setLayer(id)}
                aria-pressed={selected}
              >
                {layerLabelKo(id)}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {!expanded ? (
            <motion.div
              key="carousel"
              className="pointer-events-auto w-full max-w-[min(100vw,440px)]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div
                ref={scrollerRef}
                className={cn(
                  "flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[7.5%] pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  layerNodes.length === 1 && "justify-center px-3",
                )}
                onScroll={onScrollerScroll}
              >
                {layerNodes.map((node) => {
                  const card = buildNodePreview(node, workspace);
                  const isActive = node.id === activeNode.id;
                  const cardLayer = resolveWorkspaceObjectLayer(node);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      data-carousel-node={node.id}
                      className={cn(
                        "flex shrink-0 snap-center items-stretch gap-3 rounded-[20px] bg-white text-left shadow-[0_10px_32px_rgba(25,31,40,0.16)] ring-1 transition-[transform,box-shadow,ring-color]",
                        layerNodes.length === 1
                          ? "w-full max-w-[min(92vw,400px)]"
                          : "w-[min(78vw,300px)]",
                        isActive
                          ? "ring-[#3182f6]/35"
                          : "scale-[0.97] opacity-90 ring-black/[0.05]",
                      )}
                      onClick={() => {
                        if (!isActive) {
                          onActiveNodeChange(node.id);
                          return;
                        }
                        setExpanded(true);
                      }}
                    >
                      <div className="relative m-2.5 h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[14px] bg-[#f2f4f6]">
                        {card.heroImage ? (
                          <WorkspaceRemoteImage
                            src={card.heroImage}
                            sizes="92px"
                            priority={isActive}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[28px]">
                            {layerEmoji(cardLayer)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 py-3 pr-3">
                        <p className="line-clamp-2 text-[15px] font-semibold tracking-[-0.02em] text-[#191f28]">
                          {card.title}
                        </p>
                        <p className="mt-1 truncate text-[12px] text-[#8b95a1]">
                          {card.ratingLabel}
                          <span className="mx-1 text-[#d1d6db]">·</span>
                          {layerLabelKo(cardLayer)}
                        </p>
                        <p className="mt-1.5 text-[15px] font-bold tabular-nums text-[#191f28]">
                          {card.price}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-center">
                <button
                  type="button"
                  className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-semibold text-[#8b95a1]"
                  onClick={onClose}
                >
                  닫기
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              className="pointer-events-auto mx-3 flex w-full max-w-[min(96vw,420px)] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_-12px_48px_rgba(25,31,40,0.22)] ring-1 ring-black/[0.06]"
              style={{ maxHeight: "min(68vh, 560px)" }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              role="dialog"
              aria-label={preview.title}
            >
              <div className="relative shrink-0">
                <div className="relative h-[200px] overflow-hidden bg-[#f2f4f6]">
                  {hero ? (
                    <WorkspaceRemoteImage
                      src={hero}
                      sizes="(max-width: 420px) 96vw, 420px"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#8b95a1]">
                      <span className="text-[40px]">{layerEmoji(activeLayer)}</span>
                      <span className="text-[11px] font-semibold">
                        {copy.globe.workspacePreviewPhotoHint}
                      </span>
                    </div>
                  )}
                  {images.length > 1 ? (
                    <div className="absolute inset-x-0 bottom-0 z-[1] flex gap-1.5 overflow-x-auto px-3 pb-3 pt-10">
                      {images.map((url, i) => (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          className={cn(
                            "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-2",
                            i === galleryIndex
                              ? "ring-white"
                              : "ring-transparent opacity-80",
                          )}
                          onClick={() => setGalleryIndex(i)}
                        >
                          <WorkspaceRemoteImage src={url} sizes="48px" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
                  onClick={() => setExpanded(false)}
                  aria-label="접기"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <div className="absolute left-1/2 top-2.5 h-1 w-9 -translate-x-1/2 rounded-full bg-white/70" />
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {draftDay ? (
                      <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#4e5968]">
                        {draftDay.labelKo}
                      </span>
                    ) : null}
                    <span className="text-[12px] font-medium text-[#8b95a1]">
                      {preview.ratingLabel}
                      <span className="mx-1.5 text-[#d1d6db]">·</span>
                      {kindLabel}
                    </span>
                  </div>
                  <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[#191f28]">
                    {preview.title}
                  </h3>
                  <p className="mt-1 text-[15px] font-bold tabular-nums text-[#191f28]">
                    {preview.price}
                    <span className="ml-2 text-[12px] font-medium text-[#8b95a1]">
                      {preview.reviewSummary}
                    </span>
                  </p>
                </div>

                <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold",
                      preview.selected
                        ? "bg-[#191f28] text-white"
                        : "bg-[#3182f6] text-white",
                    )}
                    onClick={confirmSelect}
                  >
                    {preview.selected
                      ? copy.globe.workspacePreviewSelected
                      : copy.globe.workspacePreviewSelect}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold ring-1",
                      preview.inCompare
                        ? "bg-[#e8f3ff] text-[#3182f6] ring-[#3182f6]/25"
                        : "bg-white text-[#191f28] ring-black/[0.08]",
                    )}
                    onClick={addToCompare}
                  >
                    {preview.inCompare
                      ? copy.globe.workspacePreviewInCompare
                      : copy.globe.workspacePreviewAddCompare}
                    {compareCount > 0 ? ` (${compareCount})` : ""}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold ring-1 ring-black/[0.08]",
                      preview.bookmarked
                        ? "bg-[#191f28] text-white ring-transparent"
                        : "bg-white text-[#191f28]",
                    )}
                    onClick={() => {
                      applyWorkspaceTransition({
                        contextEventId,
                        op: "bookmark",
                        nodeIds: [activeNode.id],
                        pin: !activeNode.bookmarked,
                      });
                    }}
                  >
                    <Pin className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {preview.bookmarked
                      ? copy.globe.workspacePinDone
                      : copy.globe.workspacePinCta}
                  </button>
                </div>

                <ul className="divide-y divide-black/[0.05] overflow-hidden rounded-2xl bg-[#f9fafb]">
                  {preview.whyChosen ? (
                    <li className="flex items-start gap-3 px-3.5 py-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8b95a1]" />
                      <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#4e5968]">
                        {preview.whyChosen}
                      </p>
                    </li>
                  ) : null}
                  {nodeBrief && nodeBrief.linesKo[0] ? (
                    <li className="flex items-start gap-3 px-3.5 py-3">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[#8b95a1]" />
                      <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#4e5968]">
                        {nodeBrief.linesKo[0]}
                      </p>
                    </li>
                  ) : null}
                  {preview.amenities[0] ? (
                    <li className="flex items-start gap-3 px-3.5 py-3">
                      <Pin className="mt-0.5 h-4 w-4 shrink-0 text-[#8b95a1]" />
                      <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#4e5968]">
                        {preview.amenities.slice(0, 3).join(" · ")}
                      </p>
                    </li>
                  ) : null}
                </ul>

                {preview.canPrepare && primary.kind !== "done" ? (
                  <button
                    type="button"
                    className="w-full rounded-[16px] bg-[#3182f6] px-3 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(49,130,246,0.28)]"
                    onClick={() => {
                      if (primary.kind === "confirm")
                        onConfirmReady?.(activeNode.id);
                      else if (primary.kind === "approve_pay")
                        onOpenField?.(activeNode.id);
                      else onPrepareReserve?.(activeNode.id);
                    }}
                  >
                    {primary.labelKo}
                    {primary.hintKo ? (
                      <span className="mt-0.5 block text-[11px] font-medium opacity-90">
                        {primary.hintKo}
                      </span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
