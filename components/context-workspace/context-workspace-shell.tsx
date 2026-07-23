"use client";

/**
 * Context Workspace shell — 2D IDE for Context.
 * Preview 펼치기 후에만 full surface. Globe waits for Commit.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  applyWorkspaceTransition,
  buildAppleMapsDeepLink,
  buildGoogleMapsDirectionsDeepLink,
  clearContextWorkspace,
  commitContextWorkspaceToGlobe,
  domainLabelKo,
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
import { CurrentContextBar } from "@/components/context-workspace/current-context-bar";
import { WorkspaceCommitPreviewSheet } from "@/components/context-workspace/workspace-commit-preview-sheet";
import { WorkspaceWhyBalloon } from "@/components/context-workspace/workspace-why-balloon";
import { WorkspaceMapView } from "@/components/context-workspace/workspace-map-view";
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
  const [whyOpen, setWhyOpen] = useState(true);

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
    null;

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
      setWhyOpen(true);
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

  const onCollapse = useCallback(() => {
    const id = contextEventId?.trim();
    setExpanded(false);
    setCommitPreviewOpen(false);
    if (id) {
      writeContextWorkspaceExpanded(id, false);
    }
  }, [contextEventId]);

  const onClose = useCallback(() => {
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
  const showWhy =
    whyOpen &&
    state.lastWhy &&
    (selectedId || state.lastWhy.nodeIds.length > 0);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 z-[46] flex flex-col bg-[#f5f5f7]",
        className,
      )}
      role="dialog"
      aria-label={copy.globe.workspaceOpenTitle}
      data-context-workspace-open
    >
      <CurrentContextBar state={state} projectTitleKo={projectTitleKo} />

      <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white/90 px-4 py-2">
        <p className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
          {copy.globe.workspaceDraftHint}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="rounded-full bg-foreground px-3 py-2 text-[12px] font-semibold text-background"
            onClick={() => setCommitPreviewOpen(true)}
            disabled={visibleNodes.length === 0}
            data-workspace-commit
          >
            {copy.globe.workspaceCommitCta}
          </button>
          <button
            type="button"
            className="rounded-full bg-muted px-3 py-2 text-[12px] font-medium"
            onClick={onCollapse}
          >
            {copy.globe.workspaceCollapse}
          </button>
          <button
            type="button"
            className="rounded-full px-2 py-2 text-[12px] text-muted-foreground"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <WorkspaceMapView
          pins={visibleNodes.map((n) => ({
            id: n.id,
            title: n.title,
            lat: n.lat,
            lng: n.lng,
            rating: n.rating,
            selected: n.id === selectedId,
          }))}
          selectedId={selectedId}
          onSelectPin={onSelect}
        />
        {showWhy && state.lastWhy ? (
          <div className="pointer-events-auto absolute left-3 top-3 z-[2]">
            <WorkspaceWhyBalloon
              why={state.lastWhy}
              onDismiss={() => setWhyOpen(false)}
            />
          </div>
        ) : null}
        <div className="absolute inset-y-0 right-0 flex w-[min(100%,300px)] flex-col border-l border-black/5 bg-white/95 shadow-sm">
          <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
            <p className="text-[12px] font-semibold">
              {visibleNodes.length}개의 {kindLabel}
            </p>
            {state.lastWhy && !whyOpen ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-foreground"
                onClick={() => setWhyOpen(true)}
              >
                {copy.globe.workspaceWhyShow}
              </button>
            ) : null}
          </div>
          {state.compareIds.length >= 2 ? (
            <div className="border-b border-black/5 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-950">
              비교 {state.compareIds.length}곳 선택됨
            </div>
          ) : null}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
            {visibleNodes.map((node, index) => (
              <button
                key={node.id}
                type="button"
                className={cn(
                  "flex w-full gap-2 rounded-xl p-2 text-left ring-1 ring-black/5",
                  selectedId === node.id ? "bg-muted" : "bg-white",
                  state.compareIds.includes(node.id) && "ring-amber-400",
                )}
                onClick={() => onSelect(node.id)}
              >
                <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-slate-200 to-slate-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{node.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    ★ {formatRating(node.rating)} · {domainLabelKo(node.kind)}
                  </p>
                  <p className="text-[12px] font-medium">{formatPrice(node)}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{index + 1}</span>
              </button>
            ))}
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

      <div className="flex gap-2 overflow-x-auto border-t border-black/5 bg-white/95 px-3 py-2">
        <button
          type="button"
          className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium"
          onClick={() => {
            const id = contextEventId?.trim();
            if (!id) {
              return;
            }
            applyWorkspaceTransition({
              contextEventId: id,
              op: "compare",
              nodeIds:
                state.selectedIds.length >= 2
                  ? state.selectedIds
                  : visibleNodes.slice(0, 2).map((n) => n.id),
            });
            setWhyOpen(true);
          }}
        >
          {copy.globe.workspaceToolCompare}
        </button>
        <button
          type="button"
          className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium"
          onClick={() => {
            const id = contextEventId?.trim();
            if (!id) {
              return;
            }
            applyWorkspaceTransition({
              contextEventId: id,
              op: "simulate",
              simulateScenarioKo: "비 오면",
            });
            setWhyOpen(true);
          }}
        >
          {copy.globe.workspaceToolSimulateRain}
        </button>
        <button
          type="button"
          className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium"
          onClick={() => {
            const id = contextEventId?.trim();
            if (!id) {
              return;
            }
            applyWorkspaceTransition({
              contextEventId: id,
              op: "optimize_route",
            });
            setWhyOpen(true);
          }}
        >
          {copy.globe.workspaceToolOptimizeRoute}
        </button>
        {selectedId ? (
          <>
            {(() => {
              const node = visibleNodes.find((n) => n.id === selectedId);
              if (!node) {
                return null;
              }
              return (
                <>
                  <a
                    className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium"
                    href={buildAppleMapsDeepLink({
                      lat: node.lat,
                      lng: node.lng,
                      label: node.title,
                    })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apple Maps
                  </a>
                  <a
                    className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[11px] font-medium"
                    href={buildGoogleMapsDirectionsDeepLink({
                      lat: node.lat,
                      lng: node.lng,
                    })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    길찾기
                  </a>
                  <button
                    type="button"
                    className="shrink-0 rounded-full px-3 py-1.5 text-[11px] text-muted-foreground"
                    onClick={() => {
                      const id = contextEventId?.trim();
                      if (!id) {
                        return;
                      }
                      applyWorkspaceTransition({
                        contextEventId: id,
                        op: "remove",
                        nodeIds: [node.id],
                      });
                    }}
                  >
                    삭제
                  </button>
                </>
              );
            })()}
          </>
        ) : (
          <p className="px-1 py-1.5 text-[12px] text-muted-foreground">
            장소를 고르거나 말로 편집해 보세요
          </p>
        )}
      </div>
    </div>
  );
}
