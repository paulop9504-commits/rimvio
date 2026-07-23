"use client";

/**
 * Context Workspace shell — GPT Maps-style mobile surface.
 * Full-bleed map · selected card · bottom prompt. Dense chrome off.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { List, X } from "lucide-react";
import { toast } from "sonner";
import {
  applyWorkspaceTransition,
  buildAppleMapsDeepLink,
  buildGoogleMapsDirectionsDeepLink,
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
import { subscribeContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { WorkspaceCommitPreviewSheet } from "@/components/context-workspace/workspace-commit-preview-sheet";
import { WorkspaceMapView } from "@/components/context-workspace/workspace-map-view";
import { WorkspacePromptBar } from "@/components/context-workspace/workspace-prompt-bar";
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
    return `가격대 ${node.priceBand}`;
  }
  return "가격 미정";
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
        writeContextWorkspaceExpanded(detail.contextEventId, true);
      }
    });
    return () => {
      unsubUpdate();
      unsubOpen();
      unsubExpand();
    };
  }, [contextEventId, refresh]);

  const visibleNodes = useMemo(
    () => state?.nodes.filter((n) => n.visible) ?? [],
    [state],
  );
  const selectedId =
    state?.selectedIds[0] ??
    visibleNodes.find((n) => n.selected)?.id ??
    visibleNodes[0]?.id ??
    null;
  const selectedNode =
    visibleNodes.find((n) => n.id === selectedId) ?? null;

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
      applyWorkspaceTransition({
        contextEventId: id,
        op: "select",
        nodeIds: [nodeId],
      });
      setListOpen(false);
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
    // Collapse keeps draft; X closes chrome but keeps draft via collapse default.
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

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 z-[46] bg-[#f2f4f6]",
        className,
      )}
      role="dialog"
      aria-label={copy.globe.workspaceOpenTitle}
      data-context-workspace-open
    >
      {/* Full-bleed map */}
      <div className="absolute inset-0">
        <WorkspaceMapView
          pins={visibleNodes.map((n) => ({
            id: n.id,
            title: n.title,
            lat: n.lat,
            lng: n.lng,
            rating: n.rating,
            amountLabel: n.amountLabel,
            selected: n.id === selectedId,
          }))}
          selectedId={selectedId}
          onSelectPin={onSelect}
        />
      </div>

      {/* Top chrome — GPT Maps sparse */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-start justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#191f28] shadow-[0_2px_12px_rgba(25,31,40,0.12)]"
          onClick={onClose}
          aria-label={copy.globe.workspaceCollapse}
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </button>
        <div className="pointer-events-auto flex max-w-[55%] flex-col items-center gap-1">
          <div className="rounded-full bg-white/95 px-3 py-1.5 shadow-[0_2px_12px_rgba(25,31,40,0.1)]">
            <p className="truncate text-center text-[12px] font-bold tracking-tight text-[#191f28]">
              {title}
            </p>
            <p className="text-center text-[10px] tabular-nums text-[#8b95a1]">
              {visibleNodes.length}곳 · {progress}%
            </p>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#191f28] shadow-[0_2px_12px_rgba(25,31,40,0.12)]"
            onClick={() => setListOpen((v) => !v)}
            aria-label="목록"
            aria-pressed={listOpen}
          >
            <List className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className="rounded-full bg-[#3182f6] px-3 py-2 text-[11px] font-bold text-white shadow-[0_2px_12px_rgba(49,130,246,0.35)] disabled:opacity-40"
            onClick={() => setCommitPreviewOpen(true)}
            disabled={visibleNodes.length === 0}
            data-workspace-commit
          >
            {copy.globe.workspaceCommitCta}
          </button>
        </div>
      </div>

      {/* Optional list sheet — not a permanent right rail */}
      {listOpen ? (
        <div className="pointer-events-auto absolute inset-x-3 top-[5.5rem] z-[3] max-h-[42%] overflow-hidden rounded-[20px] bg-white shadow-[0_12px_40px_rgba(25,31,40,0.16)] ring-1 ring-black/[0.04]">
          <div className="flex items-center justify-between border-b border-black/[0.04] px-4 py-2.5">
            <p className="text-[13px] font-bold text-[#191f28]">
              {visibleNodes.length}개의 {kindLabel}
            </p>
            <button
              type="button"
              className="text-[12px] font-semibold text-[#8b95a1]"
              onClick={() => setListOpen(false)}
            >
              닫기
            </button>
          </div>
          <div className="max-h-[min(40vh,320px)] space-y-1 overflow-y-auto p-2">
            {visibleNodes.map((node, index) => (
              <button
                key={node.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left",
                  selectedId === node.id ? "bg-[#e8f3ff]" : "hover:bg-[#f9fafb]",
                )}
                onClick={() => onSelect(node.id)}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                    selectedId === node.id
                      ? "bg-[#3182f6] text-white"
                      : "bg-[#f2f4f6] text-[#191f28]",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[#191f28]">
                    {node.title}
                  </span>
                  <span className="block text-[11px] text-[#8b95a1]">
                    ★ {formatRating(node.rating)} · {formatPrice(node)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Bottom stack: tools · place card · prompt */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex flex-col gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-16">
        <div className="pointer-events-auto mx-auto flex max-w-xl gap-1.5 overflow-x-auto">
          {(
            [
              {
                label: copy.globe.workspaceToolCompare,
                run: () =>
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "compare",
                    nodeIds:
                      state.selectedIds.length >= 2
                        ? state.selectedIds
                        : visibleNodes.slice(0, 2).map((n) => n.id),
                  }),
              },
              {
                label: copy.globe.workspaceToolSimulateRain,
                run: () =>
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "simulate",
                    simulateScenarioKo: "비 오면",
                  }),
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
              className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#191f28] shadow-[0_2px_10px_rgba(25,31,40,0.1)]"
              onClick={tool.run}
            >
              {tool.label}
            </button>
          ))}
          {selectedNode ? (
            <>
              <a
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#191f28] shadow-[0_2px_10px_rgba(25,31,40,0.1)]"
                href={buildGoogleMapsDirectionsDeepLink({
                  lat: selectedNode.lat,
                  lng: selectedNode.lng,
                })}
                target="_blank"
                rel="noreferrer"
              >
                길찾기
              </a>
              <a
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#191f28] shadow-[0_2px_10px_rgba(25,31,40,0.1)]"
                href={buildAppleMapsDeepLink({
                  lat: selectedNode.lat,
                  lng: selectedNode.lng,
                  label: selectedNode.title,
                })}
                target="_blank"
                rel="noreferrer"
              >
                Maps
              </a>
              <button
                type="button"
                className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#f04452] shadow-[0_2px_10px_rgba(25,31,40,0.1)]"
                onClick={() =>
                  applyWorkspaceTransition({
                    contextEventId: eventId,
                    op: "remove",
                    nodeIds: [selectedNode.id],
                  })
                }
              >
                빼기
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="shrink-0 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[#8b95a1] shadow-sm"
            onClick={onDiscard}
          >
            닫기
          </button>
        </div>

        {selectedNode ? (
          <div className="pointer-events-auto mx-auto w-full max-w-xl rounded-[20px] bg-white p-3 shadow-[0_8px_28px_rgba(25,31,40,0.14)] ring-1 ring-black/[0.04]">
            <div className="flex gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#f2f4f6] text-[18px] font-bold text-[#3182f6]">
                ★{formatRating(selectedNode.rating)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold tracking-tight text-[#191f28]">
                  {selectedNode.title}
                </p>
                <p className="mt-0.5 text-[12px] text-[#8b95a1]">
                  ★ {formatRating(selectedNode.rating)} ·{" "}
                  {domainLabelKo(selectedNode.kind)}
                </p>
                <p className="mt-1 text-[14px] font-semibold text-[#191f28]">
                  {formatPrice(selectedNode)}
                </p>
              </div>
            </div>
            {state.lastChangeKo ? (
              <p className="mt-2 truncate text-[11px] text-[#8b95a1]">
                {state.lastChangeKo}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="pointer-events-auto mx-auto w-full max-w-xl">
          <WorkspacePromptBar contextEventId={eventId} compact />
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
    </div>
  );
}
