"use client";

/**
 * Object browser — ChatGPT Maps place sheet.
 * Full-width bottom sheet + big photos + prompt fused into the sheet.
 */

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
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
  /** GPT-style: prompt fused into the bottom of the place sheet */
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
  sheetFooter = null,
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
      {open ? (
        <motion.div
          key="object-browser"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] flex flex-col justify-end"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 34,
            mass: 0.95,
          }}
          data-workspace-object-carousel
        >
          <div className="pointer-events-auto mb-2 flex max-w-full gap-1.5 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

          <motion.div
            className="pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-18px_50px_rgba(25,31,40,0.28)]"
            style={{
              height: "min(84vh, 720px)",
              maxHeight: "min(84vh, 720px)",
            }}
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

            {/* One scroll surface — photo + copy move together (ChatGPT Maps sheet). */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
              <div className="relative pt-2">
                {images.length > 0 ? (
                  <div className="relative px-3">
                    {/* One large photo at a time — swipe only, no thumb strip. */}
                    <div
                      className={cn(
                        "flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                        images.length > 1
                          ? "snap-x snap-mandatory"
                          : "snap-none",
                      )}
                    >
                      {images.map((url, i) => (
                        <div
                          key={`${url}-${i}`}
                          className="relative aspect-[16/10] w-full min-w-full shrink-0 snap-center overflow-hidden rounded-[18px] bg-[#f2f4f6]"
                          aria-label={`사진 ${i + 1} / ${images.length}`}
                        >
                          <WorkspaceRemoteImage
                            src={url}
                            sizes="96vw"
                            priority={i < 2}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="absolute right-5 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-white/92 text-[#191f28] shadow-sm"
                      onClick={onClose}
                      aria-label="닫기"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div className="relative mx-3 aspect-[16/10] overflow-hidden rounded-[18px] bg-[#f2f4f6]">
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

              <div className="space-y-3 px-4 pb-3 pt-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {draftDay ? (
                      <span className="rounded-full bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-semibold text-[#4e5968]">
                        {draftDay.labelKo}
                      </span>
                    ) : null}
                    <span className="text-[13px] font-medium text-[#8b95a1]">
                      {preview.ratingLabel}
                      <span className="mx-1.5 text-[#d1d6db]">·</span>
                      {kindLabel}
                    </span>
                  </div>
                  <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#191f28]">
                    {preview.title}
                  </h3>
                  <p className="mt-1 text-[16px] font-bold tabular-nums text-[#191f28]">
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

                {layerNodes.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {layerNodes.map((node) => {
                      const card = buildNodePreview(node, workspace);
                      const on = node.id === activeNode.id;
                      return (
                        <button
                          key={node.id}
                          type="button"
                          className={cn(
                            "max-w-[9.5rem] shrink-0 truncate rounded-full px-3 py-1.5 text-[11px] font-semibold",
                            on
                              ? "bg-[#191f28] text-white"
                              : "bg-[#f2f4f6] text-[#4e5968]",
                          )}
                          onClick={() => onActiveNodeChange(node.id)}
                        >
                          {card.title}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

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
            </div>

            {sheetFooter ? (
              <div className="shrink-0 border-t border-black/[0.04] bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
                {sheetFooter}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
