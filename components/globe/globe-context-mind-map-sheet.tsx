"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GlobeContextBrainPills } from "@/components/globe/globe-context-brain-pills";
import { ProjectionNodeIcon } from "@/components/globe/projection-node-icon";
import { mindMapNodeCenter } from "@/lib/situation-projection/compute-mind-map-layout";
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
import { resolveMindMapLayout } from "@/lib/situation-projection/apply-llm-mind-map-layout";
import type {
  GhostProjectionNode,
  HubRunnablePill,
  ProjectionNode,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeContextMindMapSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifest: SituationProjectionManifest | null;
  pills: readonly HubRunnablePill[];
  onPillTap: (pill: HubRunnablePill) => void;
  tone?: "light" | "dark";
};

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

function findAnchorNode(manifest: SituationProjectionManifest | null): ProjectionNode | null {
  return (
    manifest?.nodes.find((node) => resolveProjectionNodeSemantic(node).ontologyRole === "root") ??
    manifest?.nodes[0] ??
    null
  );
}

function resolveSheetAccentClasses(
  accent: "green" | "blue" | "orange" | "purple",
  tone: "light" | "dark",
) {
  if (tone === "dark") {
    switch (accent) {
      case "green":
        return {
          iconWrap: "bg-[#123725] text-[#6ee7b7]",
          category: "text-[#8cf0c7]",
          ghostShell: "border-[#34c759]/24 bg-[#0d1912]/56",
          relation: "text-white/66",
        };
      case "orange":
        return {
          iconWrap: "bg-[#3a2612] text-[#ffb869]",
          category: "text-[#ffc98e]",
          ghostShell: "border-[#ff9500]/24 bg-[#19120d]/56",
          relation: "text-white/66",
        };
      case "purple":
        return {
          iconWrap: "bg-[#2d1d3d] text-[#e6ccff]",
          category: "text-[#e6ccff]",
          ghostShell: "border-[#bf5af2]/24 bg-[#151019]/56",
          relation: "text-white/66",
        };
      case "blue":
      default:
        return {
          iconWrap: "bg-[#11263d] text-[#8fd1ff]",
          category: "text-[#b6dcff]",
          ghostShell: "border-[#3182f6]/24 bg-[#0d1724]/56",
          relation: "text-white/66",
        };
    }
  }
  switch (accent) {
    case "green":
      return {
        iconWrap: "bg-[#e8f8ed] text-[#15803d]",
        category: "text-[#15803d]",
        ghostShell: "border-[#34c759]/18 bg-white/72",
        relation: "text-[#5f6f67]",
      };
    case "orange":
      return {
        iconWrap: "bg-[#fff4e8] text-[#c26a00]",
        category: "text-[#c26a00]",
        ghostShell: "border-[#ff9500]/18 bg-white/72",
        relation: "text-[#7d6a52]",
      };
    case "purple":
      return {
        iconWrap: "bg-[#f5edff] text-[#7c3aed]",
        category: "text-[#7c3aed]",
        ghostShell: "border-[#bf5af2]/18 bg-white/72",
        relation: "text-[#6b5e84]",
      };
    case "blue":
    default:
      return {
        iconWrap: "bg-[#e8f0fe] text-[#1d4ed8]",
        category: "text-[#1d4ed8]",
        ghostShell: "border-[#3182f6]/18 bg-white/72",
        relation: "text-[#61708a]",
      };
  }
}

function resolveInspectorActionLabel(
  key: ProjectionPresentationKey,
): string {
  switch (key) {
    case "lodging":
      return "숙소 보기";
    case "eatery":
      return "맛집 보기";
    case "activity":
      return "갈 곳 보기";
    case "info":
      return "정보 보기";
    case "ticket":
      return "티켓 열기";
    case "transit":
      return "교통 보기";
    case "flight":
      return "항공 열기";
    default:
      return "열기";
  }
}

export function GlobeContextMindMapSheet({
  open,
  onOpenChange,
  manifest,
  pills,
  onPillTap,
  tone = "light",
}: GlobeContextMindMapSheetProps) {
  const mounted = typeof document !== "undefined";
  const displayMode = "brain_focus" as const;
  const [activeFilter, setActiveFilter] =
    useState<ProjectionSurfaceFilterKey>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const displayManifest = useMemo(
    () =>
      manifest ? selectProjectionDisplayManifest(manifest, displayMode) : null,
    [displayMode, manifest],
  );
  const travelUi = manifest?.travelBrain?.ui ?? null;
  const allowAuxiliary = travelUi?.stage !== "preparing" && activeFilter !== "all";
  const visibleNodes = useMemo(
    () =>
      (displayManifest?.nodes ?? []).filter((node) =>
        isProjectionNodeVisibleForSurface({
          node,
          activeFilter,
          allowAuxiliary,
        }),
      ),
    [activeFilter, allowAuxiliary, displayManifest?.nodes],
  );
  const filterOptions = useMemo(
    () => buildProjectionSurfaceFilterOptions(displayManifest?.nodes ?? []),
    [displayManifest?.nodes],
  );

  const layout = useMemo(
    () =>
      displayManifest && visibleNodes.length > 0
        ? resolveMindMapLayout({
            ...displayManifest,
            nodes: visibleNodes,
            links: (displayManifest.links ?? []).filter(
              (link) =>
                visibleNodes.some((node) => node.id === link.fromId) &&
                visibleNodes.some((node) => node.id === link.toId),
            ),
          })
        : null,
    [displayManifest, visibleNodes],
  );

  const nodeById = useMemo(() => {
    const map = new Map<string, ProjectionNode>();
    for (const node of visibleNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [visibleNodes]);

  const layoutById = useMemo(() => {
    const map = new Map(layout?.nodes.map((entry) => [entry.id, entry]) ?? []);
    return map;
  }, [layout]);
  const anchorNode = useMemo(
    () => findAnchorNode(displayManifest),
    [displayManifest],
  );
  const anchorSemantic = anchorNode ? resolveProjectionNodeSemantic(anchorNode) : null;
  const ontologySummary = useMemo(() => {
    const labels: string[] = [];
    for (const node of visibleNodes) {
      const semantic = resolveProjectionNodeSemantic(node);
      if (semantic.ontologyRole === "root") {
        continue;
      }
      const label = semantic.relationLabelKo ?? semantic.semanticTypeLabelKo;
      if (!label || labels.includes(label)) {
        continue;
      }
      labels.push(label);
      if (labels.length >= 4) {
        break;
      }
    }
    return labels.join(" · ");
  }, [visibleNodes]);
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const selectedPill = selectedNode ? findPillForNode(selectedNode, pills) : null;
  const selectedPresentation = selectedNode
    ? resolveProjectionNodePresentation(selectedNode)
    : null;
  const selectedExplanation =
    selectedNode && manifest && anchorNode
      ? buildProjectionNodeExplanation({
          node: selectedNode,
          manifest,
          rootLabel: anchorNode.label,
        })
      : null;
  const selectedMemoBody = selectedExplanation?.memoKo ?? null;
  const selectedFactors = selectedExplanation?.factorsKo ?? [];

  useEffect(() => {
    if (!open) {
      setActiveFilter("all");
      setSelectedNodeId(null);
      return;
    }
    setActiveFilter("all");
    setSelectedNodeId(null);
  }, [manifest?.anchorEventId, open]);

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }
    const stillVisible = visibleNodes.some((node) => node.id === selectedNodeId);
    if (!stillVisible) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId, visibleNodes]);

  if (!mounted) {
    return null;
  }

  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleLinks = (displayManifest?.links ?? []).filter(
    (link) => visibleNodeIds.has(link.fromId) && visibleNodeIds.has(link.toId),
  );
  const hasGraph = Boolean(
    layout && displayManifest && visibleNodes.length > 0,
  );
  const showPills = pills.length > 0;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10040] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="globe-context-mind-map-title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[10041] mx-auto flex w-full max-w-lg max-h-[min(88dvh,640px)] flex-col overflow-hidden rounded-t-[1.25rem] shadow-2xl",
              tone === "dark"
                ? "border border-white/10 bg-[#1c1c1e]"
                : "border border-black/[0.06] bg-[#f5f5f7]",
            )}
            data-globe-context-mind-map-sheet
            data-globe-context-brain-display-mode={displayMode}
          >
            <div
              className={cn(
                "shrink-0 px-4 py-4",
                tone === "dark" ? "border-b border-white/10" : "border-b border-black/[0.06]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2
                    id="globe-context-mind-map-title"
                    className={cn(
                      "text-[16px] font-semibold tracking-tight",
                      tone === "dark" ? "text-white" : "text-[#1d1d1f]",
                    )}
                  >
                    {copy.globe.contextBrainSheetTitle}
                  </h2>
                  {anchorNode ? (
                    <p
                      className={cn(
                        "mt-0.5 text-[12px]",
                        tone === "dark" ? "text-white/55" : "text-[#86868b]",
                      )}
                    >
                      {anchorSemantic?.semanticTypeLabelKo ?? "주맥락"} ·{" "}
                      {anchorNode.label}
                      {ontologySummary ? ` · ${ontologySummary}` : ""}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full active:scale-[0.98]",
                    tone === "dark" ? "active:bg-white/10" : "active:bg-black/[0.06]",
                  )}
                  aria-label={copy.globe.contextBrainSheetClose}
                >
                  <X
                    className={cn("size-5", tone === "dark" ? "text-white/70" : "text-[#86868b]")}
                    aria-hidden
                  />
                </button>
              </div>
            </div>

            {filterOptions.length > 1 ? (
              <div
                className={cn(
                  "shrink-0 px-4 pb-1 pt-3",
                  tone === "dark" ? "border-b border-white/10" : "border-b border-black/[0.06]",
                )}
              >
                <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filterOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setActiveFilter(option.key)}
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-[0.98]",
                        activeFilter === option.key
                          ? tone === "dark"
                            ? "bg-white text-[#0f172a]"
                            : "bg-[#1d1d1f] text-white"
                          : tone === "dark"
                            ? "bg-white/8 text-white/72 ring-1 ring-white/10"
                            : "bg-white text-[#6e6e73] ring-1 ring-black/[0.06]",
                      )}
                      data-globe-context-brain-filter={option.key}
                    >
                      {option.labelKo}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {hasGraph && displayManifest && layout ? (
                <div
                  className="relative mx-auto w-full max-w-[360px]"
                  style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
                >
                  <svg
                    viewBox={`0 0 ${layout.width} ${layout.height}`}
                    className="absolute inset-0 h-full w-full"
                    aria-hidden
                    data-globe-context-mind-map-links
                  >
                    {visibleLinks.map((link) => {
                      const from = layoutById.get(link.fromId);
                      const to = layoutById.get(link.toId);
                      if (!from || !to) {
                        return null;
                      }
                      const fromCenter = mindMapNodeCenter(from);
                      const toCenter = mindMapNodeCenter(to);
                      const dashed = link.virtual || link.strokeStyle === "dashed";
                      const selected =
                        selectedNodeId != null &&
                        (link.fromId === selectedNodeId || link.toId === selectedNodeId);
                      return (
                        <line
                          key={link.id}
                          x1={fromCenter.x}
                          y1={fromCenter.y}
                          x2={toCenter.x}
                          y2={toCenter.y}
                          stroke={
                            selected
                              ? tone === "dark"
                                ? "rgba(125,193,255,0.88)"
                                : "rgba(0,113,227,0.75)"
                              : tone === "dark"
                                ? "rgba(255,255,255,0.18)"
                                : "rgba(0,0,0,0.1)"
                          }
                          strokeWidth={selected ? 2.4 : link.weight ? link.weight / 44 : dashed ? 1.25 : 1.6}
                          strokeDasharray={dashed ? "5 4" : undefined}
                          opacity={selectedNodeId && !selected ? 0.42 : 1}
                        />
                      );
                    })}
                  </svg>

                  <div
                    className="absolute inset-0"
                    data-globe-context-mind-map-nodes
                  >
                    {layout.nodes.map((entry) => {
                      const node = nodeById.get(entry.id);
                      if (!node) {
                        return null;
                      }
                      const ghost = node.kind === "ghost";
                      const semantic = resolveProjectionNodeSemantic(node);
                      const presentation = resolveProjectionNodePresentation(node);
                      const accent = resolveSheetAccentClasses(
                        presentation.discoveryAccent,
                        tone,
                      );
                      const root = semantic.ontologyRole === "root";
                      const relationLabel = !root ? presentation.axisLabelKo : null;
                      const selected = selectedNodeId === node.id;

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
                            "absolute flex flex-col items-start justify-center overflow-hidden rounded-[1rem] px-2.5 py-2 text-left transition-transform",
                            "active:scale-[0.97]",
                            root
                              ? tone === "dark"
                                ? "border border-white/24 bg-[#0b1f36]/84 text-white shadow-lg"
                                : "border border-black/[0.06] bg-[#1d1d1f] text-white shadow-sm"
                              : ghost
                              ? tone === "dark"
                                ? `border border-dashed text-white/85 ${accent.ghostShell}`
                                : `border border-dashed text-[#3a3a3c] shadow-sm ${accent.ghostShell}`
                              : tone === "dark"
                                ? "border border-white/10 bg-white/10 text-white shadow-sm"
                                : "border border-[#0071e3]/12 bg-white text-[#1d1d1f] shadow-sm",
                            selected && "ring-2 ring-[#3182f6]/42",
                            "opacity-95",
                          )}
                          style={{
                            left: `${(entry.x / layout.width) * 100}%`,
                            top: `${(entry.y / layout.height) * 100}%`,
                            width: `${(entry.width / layout.width) * 100}%`,
                            height: `${(entry.height / layout.height) * 100}%`,
                          }}
                          data-globe-context-mind-map-node={node.id}
                          data-globe-context-mind-map-node-kind={node.kind}
                          data-globe-context-mind-map-node-role={semantic.ontologyRole}
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-full",
                                root
                                  ? "bg-white/12 text-white/78"
                                  : accent.iconWrap,
                              )}
                            >
                              <ProjectionNodeIcon token={presentation.iconToken} className="size-3" />
                            </span>
                            <span
                              className={cn(
                                "truncate text-[9px] font-semibold uppercase tracking-[0.08em]",
                                root
                                  ? "text-white/58"
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
                                  : accent.relation,
                              )}
                            >
                              {relationLabel}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    "py-8 text-center text-[13px]",
                    tone === "dark" ? "text-white/55" : "text-[#86868b]",
                  )}
                  data-globe-context-mind-map-empty
                >
                  {copy.globe.contextBrainSheetEmpty}
                </p>
              )}
              {selectedNode && selectedPresentation ? (
                <div
                  className={cn(
                    "mt-3 rounded-[1.15rem] p-3",
                    tone === "dark"
                      ? "border border-white/10 bg-[#0f172a]/70 text-white"
                      : "border border-black/[0.06] bg-white text-[#1d1d1f]",
                  )}
                  data-globe-context-brain-node-inspector
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full",
                            resolveSheetAccentClasses(
                              selectedPresentation.discoveryAccent,
                              tone,
                            ).iconWrap,
                          )}
                        >
                          <ProjectionNodeIcon token={selectedPresentation.iconToken} className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-[0.08em]",
                              resolveSheetAccentClasses(
                                selectedPresentation.discoveryAccent,
                                tone,
                              ).category,
                            )}
                          >
                            {selectedPresentation.categoryLabelKo}
                          </p>
                          <p
                            className={cn(
                              "truncate text-[11px]",
                              tone === "dark" ? "text-white/60" : "text-[#6e6e73]",
                            )}
                          >
                            {selectedPresentation.axisLabelKo}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-snug">
                        {selectedNode.label}
                      </p>
                      {selectedMemoBody ? (
                        <div
                          className={cn(
                            "mt-2 rounded-[0.95rem] p-2.5",
                            tone === "dark"
                              ? "border border-[#e8d3a8]/35 bg-[#fff7e7]/10"
                              : "border border-[#ead9b5] bg-[#fff7e7]",
                          )}
                        >
                          <p
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-[0.08em]",
                              tone === "dark" ? "text-[#f0d7ab]" : "text-[#7a6240]",
                            )}
                          >
                            메모
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-[11px] leading-snug",
                              tone === "dark" ? "text-white/80" : "text-[#4a3822]",
                            )}
                          >
                            {selectedMemoBody}
                          </p>
                        </div>
                      ) : null}
                      {selectedFactors.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedFactors.map((factor) => (
                            <span
                              key={factor}
                              className={cn(
                                "rounded-full px-2 py-1 text-[10px] font-semibold",
                                tone === "dark"
                                  ? "bg-white/10 text-white/74 ring-1 ring-white/10"
                                  : "bg-[#f5f0e2] text-[#5c4528] ring-1 ring-[#ead9b5]",
                              )}
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(null)}
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full active:scale-[0.98]",
                        tone === "dark" ? "bg-white/8 text-white/70" : "bg-black/[0.04] text-[#6e6e73]",
                      )}
                      aria-label="선택 닫기"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                  {selectedPill ? (
                    <button
                      type="button"
                      onClick={() => onPillTap(selectedPill)}
                      className={cn(
                        "mt-3 w-full rounded-[0.95rem] px-3 py-2.5 text-[13px] font-semibold active:scale-[0.99]",
                        tone === "dark"
                          ? "bg-white text-[#0f172a]"
                          : "bg-[#1d1d1f] text-white",
                      )}
                      data-globe-context-brain-node-inspector-action
                    >
                      {resolveInspectorActionLabel(selectedPresentation.key)}
                    </button>
                  ) : null}
                </div>
              ) : (
                null
              )}
            </div>

            {showPills ? (
              <div
                className={cn(
                  "shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2",
                  tone === "dark" ? "border-t border-white/10" : "border-t border-black/[0.06]",
                )}
              >
                <GlobeContextBrainPills pills={pills} onPillTap={onPillTap} tone={tone} />
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
