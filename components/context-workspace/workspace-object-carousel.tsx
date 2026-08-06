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
import { AnimatePresence, motion } from "framer-motion";
import {
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
import {
  buildImmediatePlaceBrief,
  buildPlaceBriefFactPack,
  resolveLodgingInventoryForNode,
  type PlaceBrief,
} from "@/lib/context-workspace/place-brief";
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
import { WorkspacePlaceBriefSection } from "@/components/context-workspace/workspace-place-brief-section";
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

  /** Never invent a cross-layer fallback — that caused hotel↔play tab/content thrash. */
  const activeNode =
    (activeNodeId
      ? nodes.find((n) => n.id === activeNodeId) ?? null
      : null) ?? null;

  const [layer, setLayer] = useState<WorkspaceObjectLayerId>(() =>
    activeNode
      ? resolveWorkspaceObjectLayer(activeNode)
      : (presentLayers[0] ?? "hotel"),
  );
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  /** Near-full by default (top header + map peek retained). Mid snap on drag down. */
  const SHEET_RATIO_FULL = 0.94;
  const SHEET_RATIO_MID = 0.58;
  const SHEET_RATIO_MIN = 0.42;

  const [heightRatio, setHeightRatio] = useState(SHEET_RATIO_FULL);
  const heightRatioRef = useRef(SHEET_RATIO_FULL);
  const resizeDragRef = useRef<{
    startY: number;
    startRatio: number;
  } | null>(null);
  const briefFetchedForIdRef = useRef<string | null>(null);

  const layerNodes = useMemo(
    () => filterNodesByObjectLayer(nodes, layer),
    [nodes, layer],
  );

  useEffect(() => {
    if (!open) {
      setHeightRatio(SHEET_RATIO_FULL);
      heightRatioRef.current = SHEET_RATIO_FULL;
    }
  }, [open]);

  const setRatio = (next: number) => {
    const clamped = Math.min(1, Math.max(SHEET_RATIO_MIN, next));
    heightRatioRef.current = clamped;
    setHeightRatio(clamped);
  };

  const sheetTall = heightRatio >= 0.78;

  // External focus (map / timeline) → follow that node's layer (tab only).
  useEffect(() => {
    if (!activeNodeId) return;
    const node = nodes.find((n) => n.id === activeNodeId);
    if (!node) return;
    const next = resolveWorkspaceObjectLayer(node);
    setLayer((prev) => (prev === next ? prev : next));
  }, [activeNodeId, nodes]);

  // Only auto-pick a node when focus is missing from the sheet list.
  // Never steal focus across layers (that caused hotel↔play thrash + 429).
  const layerLeadId = layerNodes[0]?.id ?? null;
  useEffect(() => {
    if (!open || !layerLeadId) return;
    if (activeNodeId && nodes.some((n) => n.id === activeNodeId)) return;
    if (layerLeadId === activeNodeId) return;
    onActiveNodeChange(layerLeadId);
  }, [open, activeNodeId, layerLeadId, nodes, onActiveNodeChange]);

  const selectLayer = (id: WorkspaceObjectLayerId) => {
    setLayer(id);
    const first = filterNodesByObjectLayer(nodes, id)[0];
    if (first && first.id !== activeNodeId) {
      onActiveNodeChange(first.id);
    }
  };

  const preview = useMemo(
    () => (activeNode ? buildNodePreview(activeNode, workspace) : null),
    [activeNode, workspace],
  );

  const destinationKo =
    workspace.realityDraft?.destinationKo?.trim() || null;

  const immediateBrief = useMemo(() => {
    if (!activeNode) return null;
    return buildImmediatePlaceBrief({
      contextEventId,
      node: activeNode,
      destinationKo,
    });
  }, [activeNode, contextEventId, destinationKo]);

  const [placeBrief, setPlaceBrief] = useState<PlaceBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    const nodeId = activeNode?.id ?? null;
    if (!activeNode || !open || !nodeId) {
      setPlaceBrief(null);
      briefFetchedForIdRef.current = null;
      return;
    }
    const facts = buildImmediatePlaceBrief({
      contextEventId,
      node: activeNode,
      destinationKo,
    });
    setPlaceBrief(facts);
    // Avoid hammering /api/workspace/place-brief when focus flickers.
    if (briefFetchedForIdRef.current === nodeId) {
      setBriefLoading(false);
      return;
    }
    briefFetchedForIdRef.current = nodeId;
    setBriefLoading(true);
    const inventory = resolveLodgingInventoryForNode({
      contextEventId,
      node: activeNode,
    });
    const pack = buildPlaceBriefFactPack({
      node: activeNode,
      inventory,
      destinationKo,
    });
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/workspace/place-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pack, allowLlm: true }),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          ok?: boolean;
          brief?: PlaceBrief;
        };
        if (!cancelled && json.ok && json.brief) {
          setPlaceBrief(json.brief);
        }
      } catch {
        // Keep deterministic facts brief.
      } finally {
        if (!cancelled) setBriefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNode?.id, contextEventId, destinationKo, open]);

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

  if (!open || presentLayers.length === 0) {
    return null;
  }

  // Waiting for layer→focus sync — don't render wrong-category flash.
  if (!activeNode || !preview) {
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
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[10160] flex flex-col pt-0"
            style={{
              height: `min(${Math.round(heightRatio * 1000) / 10}dvh, calc(100dvh - env(safe-area-inset-top, 0px)))`,
              maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px))",
            }}
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
            data-sheet-tall={sheetTall ? "1" : "0"}
          >
          <motion.div
            className="pointer-events-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-12px_40px_rgba(25,31,40,0.22)]"
            role="dialog"
            aria-label={preview.title}
            data-workspace-place-sheet
          >
            <div
              className="relative shrink-0 cursor-grab touch-none select-none pt-2 active:cursor-grabbing"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                resizeDragRef.current = {
                  startY: e.clientY,
                  startRatio: heightRatioRef.current,
                };
              }}
              onPointerMove={(e) => {
                const drag = resizeDragRef.current;
                if (!drag || typeof window === "undefined") return;
                const vh = Math.max(1, window.innerHeight);
                // Finger moves up → smaller clientY → taller sheet.
                const delta = (drag.startY - e.clientY) / vh;
                setRatio(drag.startRatio + delta);
              }}
              onPointerUp={(e) => {
                const drag = resizeDragRef.current;
                resizeDragRef.current = null;
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  /* already released */
                }
                if (!drag) return;
                const ratio = heightRatioRef.current;
                const dy = e.clientY - drag.startY;
                if (ratio < 0.5 && dy > 120) {
                  onClose();
                  return;
                }
                // Snap: near-full · mid — never leave the sheet stuck mid-drag.
                if (ratio >= 0.72) setRatio(SHEET_RATIO_FULL);
                else setRatio(SHEET_RATIO_MID);
              }}
              onPointerCancel={() => {
                resizeDragRef.current = null;
              }}
              onDoubleClick={() =>
                setRatio(
                  heightRatioRef.current >= 0.78
                    ? SHEET_RATIO_MID
                    : SHEET_RATIO_FULL,
                )
              }
              aria-label={
                sheetTall ? "시트 줄이기" : "위로 드래그하면 시트가 커져요"
              }
            >
              <div className="mx-auto h-1 w-9 rounded-full bg-[#d1d6db]" />
            </div>

            {presentLayers.length > 1 ? (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1.5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {presentLayers.map((id) => {
                  const selected = id === layer;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                        selected
                          ? "bg-[#191f28] text-white"
                          : "bg-[#f2f4f6] text-[#4e5968]",
                      )}
                      onClick={() => selectLayer(id)}
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
                        "flex touch-pan-x overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
                          className={cn(
                            "relative w-full min-w-full shrink-0 snap-center overflow-hidden bg-[#f2f4f6]",
                            sheetTall
                              ? "h-[min(42vh,360px)]"
                              : "h-[min(28vh,240px)]",
                          )}
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
                      className="absolute right-3 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-[2px]"
                      onClick={onClose}
                      aria-label="닫기"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div className="relative h-[min(28vh,240px)] overflow-hidden bg-[#f2f4f6]">
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
                      className="absolute right-2.5 top-2.5 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-[2px]"
                      onClick={onClose}
                      aria-label="닫기"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5">
                <div>
                  <h3 className="text-[19px] font-semibold leading-[1.3] tracking-[-0.025em] text-[#191f28]">
                    {preview.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] font-medium leading-snug text-[#6b7684]">
                    {preview.ratingLabel}
                    <span className="mx-1.5 text-[#c4c9d0]">·</span>
                    {kindLabel}
                    {preview.price && preview.price !== "—" ? (
                      <>
                        <span className="mx-1.5 text-[#c4c9d0]">·</span>
                        <span className="tabular-nums text-[#191f28]">
                          {preview.price}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 rounded-full px-3 py-2.5 text-[14px] font-semibold",
                      preview.selected
                        ? "bg-[#191f28] text-white"
                        : "bg-[#191f28] text-white",
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
                      "min-w-0 flex-1 rounded-full px-3 py-2.5 text-[14px] font-semibold ring-[1.5px]",
                      preview.inCompare
                        ? "bg-[#f2f4f6] text-[#191f28] ring-[#191f28]/15"
                        : "bg-white text-[#191f28] ring-[#d1d6db]",
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
                      "inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-3 py-2.5 text-[14px] font-semibold ring-[1.5px]",
                      preview.bookmarked
                        ? "bg-[#191f28] text-white ring-transparent"
                        : "bg-white text-[#191f28] ring-[#d1d6db]",
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
                  <ul className="space-y-0">
                    {factLines.map((row) => (
                      <li
                        key={`${row.icon}-${row.text.slice(0, 24)}`}
                        className="flex items-start gap-3 py-2.5"
                      >
                        {row.icon === "pin" ? (
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8b95a1]" />
                        ) : row.icon === "globe" ? (
                          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[#8b95a1]" />
                        ) : (
                          <Pin className="mt-0.5 h-4 w-4 shrink-0 text-[#8b95a1]" />
                        )}
                        <p className="min-w-0 flex-1 text-[15px] leading-[1.45] text-[#4e5968]">
                          {row.text}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <WorkspacePlaceBriefSection
                  brief={placeBrief ?? immediateBrief}
                  loading={briefLoading && !(placeBrief ?? immediateBrief)?.introKo}
                />

                {preview.canPrepare && primary.kind !== "done" ? (
                  <button
                    type="button"
                    className="w-full rounded-full bg-[#3182f6] px-4 py-3.5 text-[15px] font-semibold text-white"
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
                      <span className="mt-0.5 block text-[12px] font-medium opacity-90">
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
