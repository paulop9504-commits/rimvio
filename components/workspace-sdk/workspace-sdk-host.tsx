"use client";

/**
 * Workspace SDK Host — six regions only (ADR-026).
 * Action → Field prep · Focus advance · Commit → 결재함.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  readContextWorkspace,
  subscribeContextWorkspaceUpdated,
  type ContextWorkspaceNode,
} from "@/lib/context-workspace";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";
import {
  readFocusGhostLines,
  runWorkspaceSdkAction,
  runWorkspaceSdkCommit,
  runWorkspaceSdkFocusAdvance,
} from "@/lib/workspace-sdk/run-workspace-sdk-host-actions";
import {
  readWorkspaceSdkSession,
  subscribeWorkspaceSdkSession,
} from "@/lib/workspace-sdk/workspace-sdk-session-store";
import {
  listRealityPrimitiveStrip,
  readContextRealityBundle,
  composeLinkedReality,
  type RealityPrimitiveStripRow,
} from "@/lib/reality-os";
import { buildWorkspaceNodeProjectionModel } from "@/lib/reality-os/node-projection-model";
import { WorkspaceSdkNodeBody } from "@/components/workspace-sdk/workspace-sdk-node-body";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import {
  CONTEXT_REFERENCE_LINKS_UPDATED,
} from "@/lib/context-reference";

export type WorkspaceSdkHostProps = {
  contextEventId: string | null | undefined;
  className?: string;
};

export function WorkspaceSdkHost({
  contextEventId,
  className,
}: WorkspaceSdkHostProps) {
  const [frame, setFrame] = useState<WorkspaceSdkFrame | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<readonly ContextWorkspaceNode[]>([]);
  const [completedSlotIds, setCompletedSlotIds] = useState<string[]>([]);
  const [linkTick, setLinkTick] = useState(0);

  const hubId = contextEventId?.trim() || "";

  const refresh = useCallback(
    (eventId?: string) => {
      const id = (eventId ?? hubId).trim();
      if (!id) {
        return;
      }
      const next = readWorkspaceSdkSession(id);
      if (next) {
        setFrame(next);
      }
      const ws = readContextWorkspace(id);
      setNodes(ws?.nodes.filter((n) => n.visible).slice(0, 8) ?? []);
      const explicitId =
        ws?.selectedIds[0] ??
        ws?.nodes.find((n) => n.selected && n.visible)?.id ??
        null;
      if (explicitId) {
        setSelectedId(explicitId);
      }
    },
    [hubId],
  );

  useEffect(() => {
    refresh();
    const unsub = subscribeWorkspaceSdkSession((id) => {
      refresh(id);
      setOpen(true);
    });
    const unsubWs = subscribeContextWorkspaceUpdated((eventId) => {
      if (!hubId || eventId === hubId) {
        refresh(eventId);
      }
    });
    const onLinks = () => setLinkTick((n) => n + 1);
    if (typeof window !== "undefined") {
      window.addEventListener(CONTEXT_REFERENCE_LINKS_UPDATED, onLinks);
    }
    return () => {
      unsub();
      unsubWs();
      if (typeof window !== "undefined") {
        window.removeEventListener(CONTEXT_REFERENCE_LINKS_UPDATED, onLinks);
      }
    };
  }, [hubId, refresh]);

  const selected = useMemo(() => {
    const explicit =
      nodes.find((n) => n.id === selectedId && n.selected) ??
      nodes.find((n) => n.selected) ??
      null;
    // Soft UI focus alone is not enough for booking.prepare — require explicit select.
    if (explicit) return explicit;
    if (selectedId) {
      return nodes.find((n) => n.id === selectedId) ?? null;
    }
    return null;
  }, [nodes, selectedId]);

  const canPrepare = Boolean(selected?.selected);

  const ghostLines = useMemo(
    () => (frame ? readFocusGhostLines(frame) : []),
    [frame],
  );

  const primitiveStrip: readonly RealityPrimitiveStripRow[] = useMemo(() => {
    const id = frame?.contextEventId?.trim() || hubId;
    if (!id) {
      return [];
    }
    const bundle = readContextRealityBundle(id);
    return bundle ? listRealityPrimitiveStrip(bundle) : [];
  }, [frame, hubId, completedSlotIds, linkTick]);

  const linkedReality = useMemo(() => {
    const id = frame?.contextEventId?.trim() || hubId;
    if (!id) {
      return null;
    }
    return composeLinkedReality({ targetEventId: id });
  }, [frame, hubId, linkTick, completedSlotIds]);

  const nodeModel = useMemo(() => {
    if (!frame) {
      return null;
    }
    const id = frame.contextEventId?.trim() || hubId;
    const bundle = id ? readContextRealityBundle(id) : null;
    return buildWorkspaceNodeProjectionModel({ frame, bundle });
  }, [frame, hubId, completedSlotIds]);

  if (!open || !frame || !nodeModel) {
    return null;
  }

  const ctx = frame.contextEventId?.trim() || hubId;
  const linkedCount = linkedReality?.links.length ?? 0;

  const onAction = () => {
    if (frame.action.toolId === "booking.prepare" && !canPrepare) {
      toast.message(copy.globe.workspacePreviewSelectFirstHint);
      return;
    }
    const result = runWorkspaceSdkAction({
      frame,
      placeId: selected?.placeId || selected?.id,
      placeName: selected?.title,
      lat: selected?.lat,
      lng: selected?.lng,
      nodeKind:
        selected?.kind === "eatery"
          ? "eatery"
          : selected?.kind === "poi"
            ? "activity"
            : "lodging",
      requireExplicitSelect: frame.action.toolId === "booking.prepare",
      explicitlySelected: canPrepare,
    });
    if (!result.ok) {
      toast.message(result.reasonKo);
      return;
    }
    setFrame(result.frame);
    if (result.mapsUrl && typeof window !== "undefined") {
      window.open(result.mapsUrl, "_blank", "noopener,noreferrer");
    }
    toast.success(result.toastKo);
  };

  const onFocusNext = () => {
    const result = runWorkspaceSdkFocusAdvance({
      frame,
      completedSlotIds,
    });
    if (!result.ok) {
      toast.message(result.reasonKo);
      return;
    }
    setCompletedSlotIds((prev) => [
      ...prev,
      frame.primaryFocus.slotId,
    ]);
    setFrame(result.frame);
    toast.message(result.toastKo);
  };

  const onCommit = () => {
    const result = runWorkspaceSdkCommit({ frame });
    if (!result.ok) {
      toast.message(result.reasonKo);
      return;
    }
    setFrame(result.frame);
    toast.message(result.toastKo);
    setOpen(false);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-end justify-center bg-black/25 p-3 sm:items-center",
        className,
      )}
      data-workspace-sdk-host
      role="dialog"
      aria-label={frame.header.titleKo}
    >
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-white shadow-lg">
        <header className="flex items-start justify-between gap-3 border-b border-black/[0.04] px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#8b95a1]">
              {frame.header.eyebrowKo}
            </p>
            <h2 className="truncate text-[18px] font-semibold tracking-tight text-[#191f28]">
              {frame.header.titleKo}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[#8b95a1]"
            aria-label={copy.globe.workspaceCollapse}
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-black/[0.04] px-4 py-2.5">
          <p className="text-[11px] font-medium text-[#3182f6]">
            {frame.ai.roleLabelKo}
          </p>
          <p className="mt-0.5 text-[13px] text-[#4e5968]">
            {frame.ai.stripHintKo || frame.primaryFocus.askKo}
          </p>
          {primitiveStrip.length > 0 ? (
            <div className="mt-2" data-workspace-reality-primitives>
              <p className="text-[10px] font-medium text-[#8b95a1]">
                {copy.globe.workspaceProgressiveEyebrow}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {primitiveStrip.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px]",
                      row.state === "active"
                        ? "bg-[#e8f3ff] font-medium text-[#3182f6]"
                        : "bg-[#f2f4f6] text-[#8b95a1]",
                    )}
                    title={
                      row.state === "active"
                        ? copy.globe.workspaceProgressiveActive
                        : copy.globe.workspaceProgressiveLatent
                    }
                  >
                    {row.labelKo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {linkedCount > 0 && linkedReality ? (
            <div className="mt-2" data-workspace-linked-reality>
              <p className="text-[10px] font-medium text-[#8b95a1]">
                {copy.globe.contextReferenceLinkedStrip}
              </p>
              <p className="mt-1 text-[12px] text-[#4e5968]">
                {linkedReality.summaryKo}
              </p>
            </div>
          ) : null}
        </div>

        <div className="px-4 pt-4">
          <p className="text-[12px] font-semibold text-[#191f28]">
            {frame.primaryFocus.headlineKo}
          </p>
          {ghostLines.length > 0 ? (
            <ul className="mt-2 space-y-0.5">
              {ghostLines.slice(0, 4).map((line) => (
                <li key={line} className="text-[11px] text-[#8b95a1]">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-2 text-[11px] text-[#8b95a1]">{frame.node.labelKo}</p>
          <WorkspaceSdkNodeBody
            model={nodeModel}
            nodes={nodes}
            selectedId={selectedId}
            focusSlotId={frame.primaryFocus.slotId}
            emptyHintKo={
              frame.primaryFocus.slotId === "flight"
                ? copy.globe.workspaceSdkFlightSkipHint
                : copy.globe.workspaceDraftHint
            }
            onSelectNode={setSelectedId}
            onFocusNext={onFocusNext}
            showFlightSkip={frame.primaryFocus.slotId === "flight"}
          />
        </div>

        <div className="space-y-2 border-t border-black/[0.04] px-4 py-3">
          {(() => {
            const commitReady =
              frame.lifecycle === "action_ready" ||
              frame.lifecycle === "awaiting_commit";
            const showCommit =
              commitReady || frame.primaryFocus.slotId === "hotel";
            const showAction =
              !commitReady && frame.primaryFocus.slotId !== "flight";
            return (
              <>
                {showAction ? (
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-[#3182f6] py-3 text-[14px] font-semibold text-white disabled:opacity-40"
                    onClick={onAction}
                    disabled={
                      frame.action.toolId === "booking.prepare" && !canPrepare
                    }
                    data-workspace-sdk-action
                  >
                    {frame.action.labelKo}
                  </button>
                ) : null}
                {showCommit ? (
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-2xl py-3 text-[14px] font-semibold text-white",
                      commitReady ? "bg-[#3182f6]" : "bg-[#191f28]",
                    )}
                    onClick={onCommit}
                    data-workspace-sdk-commit
                  >
                    {frame.commit.labelKo}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-[#f2f4f6] py-3 text-[14px] font-semibold text-[#4e5968]"
                    onClick={onFocusNext}
                    data-workspace-sdk-focus-next
                  >
                    {copy.globe.workspaceSdkFocusNext}
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
