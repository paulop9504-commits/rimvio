"use client";

/**
 * Object browser — ChatGPT Maps place sheet.
 * Full-bleed bottom sheet (no prompt). Prompt stays on the dock when sheet is closed.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  MapPin,
  Pin,
  X,
} from "lucide-react";
import {
  applyWorkspaceTransition,
  type ContextWorkspaceNode,
  type ContextWorkspaceState,
} from "@/lib/context-workspace";
import { buildNodePreview } from "@/lib/context-workspace/build-node-preview";
import { buildNodeContextBrief } from "@/lib/context-workspace/context-brief/build-node-brief";
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
  /** @deprecated Prompt is not fused into the place sheet (GPT Maps style). */
  sheetFooter?: ReactNode;
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
  const sheetDragControls = useDragControls();
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const layerNodes = useMemo(
    () => filterNodesByObjectLayer(nodes, layer),
    [nodes, layer],
  );

  useEffect(() => {
    if (!activeNode) return;
    const next = resolveWorkspaceObjectLayer(activeNode);
    setLayer((prev) => (prev === next ? prev : next));
  }, [activeNode]);

  useEffect(() => {
    if (layerNodes.length === 0) return;
    if (activeNode && resolveWorkspaceObjectLayer(activeNode) === layer) return;
    const first = layerNodes[0];
    if (first) onActiveNodeChange(first.id);
  }, [layer, layerNodes, activeNode, onActiveNodeChange]);

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

  useEffect(() => {
    setPhotoIndex(0);
    galleryRef.current?.scrollTo({ left: 0 });
  }, [activeNode?.id]);

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
  const compareCount = workspace.compareIds.length;
  const activeLayer = resolveWorkspaceObjectLayer(activeNode);
  const kindLabel = layerLabelKo(activeLayer);
  const activeIndex = layerNodes.findIndex((n) => n.id === activeNode.id);
  const hasSiblings = layerNodes.length > 1;

  const goSibling = (dir: -1 | 1) => {
    if (!hasSiblings || activeIndex < 0) return;
    const next =
      layerNodes[(activeIndex + dir + layerNodes.length) % layerNodes.length];
    if (next) onActiveNodeChange(next.id);
  };

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

  const factLines: { icon: "pin" | "globe" | "tag"; text: string }[] = [];
  const summaryOnly = activeNode.summaryKo.trim();
  if (summaryOnly) {
    factLines.push({ icon: "pin", text: summaryOnly });
  } else if (preview.nearby[0]) {
    factLines.push({ icon: "pin", text: preview.nearby[0].labelKo });
  }
  if (nodeBrief?.linesKo[0]) {
    factLines.push({ icon: "globe", text: nodeBrief.linesKo[0] });
  }
  if (preview.amenities[0]) {
    factLines.push({
      icon: "tag",
      text: preview.amenities.slice(0, 3).join(" · "),
    });
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="object-browser"
          className="pointer-events-none absolute inset-0 z-[6] flex flex-col"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 36,
            mass: 0.9,
          }}
          data-workspace-object-carousel
        >
          <motion.div
            className="pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-18px_50px_rgba(25,31,40,0.28)]"
            drag="y"
            dragControls={sheetDragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 800) {
                onClose();
              }
            }}
            role="dialog"
            aria-label={preview.title}
            data-workspace-place-sheet
          >
            <div
              className="relative shrink-0 cursor-grab touch-none pt-2.5 active:cursor-grabbing"
              onPointerDown={(e) => sheetDragControls.start(e)}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-[#d1d6db]" />
            </div>

            {presentLayers.length > 1 ? (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {presentLayers.map((id) => {
                  const selected = id === layer;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
                        selected
                          ? "bg-[#191f28] text-white"
                          : "bg-[#f2f4f6] text-[#4e5968]",
                      )}
                      onClick={() => setLayer(id)}
                      aria-pressed={selected}
                    >
                      {layerLabelKo(id)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="relative">
                {images.length > 0 ? (
                  <div className="relative">
                    <div
                      ref={galleryRef}
                      className={cn(
                        "flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                        images.length > 1
                          ? "snap-x snap-mandatory"
                          : "snap-none",
                      )}
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const w = el.clientWidth || 1;
                        setPhotoIndex(
                          Math.round(el.scrollLeft / w),
                        );
                      }}
                    >
                      {images.map((url, i) => (
                        <div
                          key={`${url}-${i}`}
                          className="relative aspect-[4/5] w-full min-w-full shrink-0 snap-center overflow-hidden bg-[#f2f4f6] sm:aspect-[16/11]"
                          aria-label={`사진 ${i + 1} / ${images.length}`}
                        >
                          <WorkspaceRemoteImage
                            src={url}
                            sizes="100vw"
                            priority={i < 2}
                          />
                        </div>
                      ))}
                    </div>

                    {images.length > 1 ? (
                      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                        {images.map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full transition-colors",
                              i === photoIndex
                                ? "bg-white"
                                : "bg-white/45",
                            )}
                          />
                        ))}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      className="absolute right-3 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-[#191f28] shadow-sm"
                      onClick={onClose}
                      aria-label="닫기"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>

                    {hasSiblings ? (
                      <>
                        <button
                          type="button"
                          className="absolute left-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-[#191f28] shadow-sm"
                          onClick={() => goSibling(-1)}
                          aria-label="이전 후보"
                        >
                          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-[#191f28] shadow-sm"
                          onClick={() => goSibling(1)}
                          aria-label="다음 후보"
                        >
                          <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#f2f4f6] sm:aspect-[16/11]">
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#8b95a1]">
                      <span className="text-[44px]">
                        {layerEmoji(activeLayer)}
                      </span>
                      <span className="text-[11px] font-semibold">
                        {copy.globe.workspacePreviewPhotoHint}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="absolute right-3 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-[#191f28] shadow-sm"
                      onClick={onClose}
                      aria-label="닫기"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3.5 px-4 pb-5 pt-3">
                <div>
                  <h3 className="text-[17px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#191f28]">
                    {preview.title}
                  </h3>
                  <p className="mt-1 text-[13px] font-medium leading-snug text-[#6b7684]">
                    {preview.ratingLabel}
                    <span className="mx-1 text-[#d1d6db]">·</span>
                    {kindLabel}
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-[#191f28]">
                    {preview.price}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 rounded-full px-2.5 py-2 text-[12px] font-semibold",
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
                      "min-w-0 flex-1 rounded-full px-2.5 py-2 text-[12px] font-semibold ring-1",
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
                      "inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2.5 py-2 text-[12px] font-semibold ring-1 ring-black/[0.08]",
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
                    <Pin className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                    {preview.bookmarked
                      ? copy.globe.workspacePinDone
                      : copy.globe.workspacePinCta}
                  </button>
                </div>

                {factLines.length > 0 ? (
                  <ul className="divide-y divide-black/[0.06]">
                    {factLines.map((row) => (
                      <li
                        key={`${row.icon}-${row.text.slice(0, 24)}`}
                        className="flex items-start gap-2.5 py-2.5 first:pt-0.5"
                      >
                        {row.icon === "pin" ? (
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b95a1]" />
                        ) : row.icon === "globe" ? (
                          <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b95a1]" />
                        ) : (
                          <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8b95a1]" />
                        )}
                        <p className="min-w-0 flex-1 text-[13px] leading-[1.45] text-[#4e5968]">
                          {row.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {preview.canPrepare && primary.kind !== "done" ? (
                  <button
                    type="button"
                    className="w-full rounded-[14px] bg-[#3182f6] px-3 py-3 text-[14px] font-semibold text-white shadow-[0_8px_20px_rgba(49,130,246,0.28)]"
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
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
