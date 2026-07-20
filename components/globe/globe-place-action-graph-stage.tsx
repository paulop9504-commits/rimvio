"use client";

/**
 * Place Action Graph shell — AI next-3 + 알아두기 / 둘러보기 / 할 일.
 * L1 only: never Ontology / Entity / Action Graph in UI.
 */

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import {
  clearPlaceExploreSession,
  readPlaceExploreSession,
  subscribePlaceExploreSession,
} from "@/lib/globe/entity-explore";
import type {
  PlaceExploreGraphNode,
  PlaceExploreSessionV1,
} from "@/lib/globe/entity-explore";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type GlobePlaceActionGraphStageProps = {
  onExploreNode: (node: PlaceExploreGraphNode) => void;
  onActionNode: (node: PlaceExploreGraphNode) => void;
  onClose?: () => void;
  className?: string;
};

function NodeChip({
  node,
  onPress,
}: {
  node: PlaceExploreGraphNode;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex min-w-0 flex-col items-start gap-0.5 rounded-xl bg-[#f5f5f7] px-2.5 py-2 text-left ring-1 ring-black/[0.04] transition active:scale-[0.98]"
      data-place-explore-node={node.id}
      data-place-explore-branch={node.branch}
    >
      <span className="text-[15px] leading-none" aria-hidden>
        {node.emoji}
      </span>
      <span className="text-[12px] font-semibold tracking-tight text-[#191f28]">
        {node.labelKo}
      </span>
      {node.detailKo ? (
        <span className="line-clamp-1 text-[10px] text-[#8b95a1]">
          {node.detailKo}
        </span>
      ) : null}
    </button>
  );
}

function Section({
  title,
  nodes,
  onNode,
}: {
  title: string;
  nodes: readonly PlaceExploreGraphNode[];
  onNode: (node: PlaceExploreGraphNode) => void;
}) {
  if (nodes.length === 0) {
    return null;
  }
  return (
    <section className="space-y-1.5">
      <p className="text-[11px] font-semibold text-[#8b95a1]">{title}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {nodes.map((node) => (
          <NodeChip key={node.id} node={node} onPress={() => onNode(node)} />
        ))}
      </div>
    </section>
  );
}

export function GlobePlaceActionGraphStage({
  onExploreNode,
  onActionNode,
  onClose,
  className,
}: GlobePlaceActionGraphStageProps) {
  const [session, setSession] = useState<PlaceExploreSessionV1 | null>(() =>
    readPlaceExploreSession(),
  );

  useEffect(() => {
    return subscribePlaceExploreSession(() => {
      setSession(readPlaceExploreSession());
    });
  }, []);

  const handleClose = useCallback(() => {
    clearPlaceExploreSession();
    onClose?.();
  }, [onClose]);

  const handleKnowledge = useCallback((node: PlaceExploreGraphNode) => {
    toast.message(node.labelKo, {
      description: node.detailKo ?? undefined,
    });
  }, []);

  const handleAiNext = useCallback(
    (node: PlaceExploreGraphNode) => {
      if (node.exploreId || node.projectable) {
        onExploreNode(node);
        return;
      }
      if (node.actionId) {
        onActionNode(node);
      }
    },
    [onActionNode, onExploreNode],
  );

  if (!session) {
    return null;
  }

  const { graph } = session;
  const entity = graph.entity;
  const factsLine =
    entity.evidenceLineKo?.trim() ||
    entity.contextLabelKo?.trim() ||
    copy.globe.placeActionGraphFactsFallback;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[32]", className)}
      data-globe-place-action-graph-stage
    >
      <GlobeBrainSurfaceFloatingFrame
        frameId="place-action-graph"
        dragLabel={copy.globe.placeActionGraphDragAria}
        shellClassName="pointer-events-auto overflow-hidden rounded-2xl border border-white/85 bg-white/96 text-slate-900 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl ring-1 ring-black/[0.04]"
        bodyClassName="p-0"
      >
        <div className="flex max-h-full flex-col">
          <header className="flex items-start justify-between gap-2 border-b border-black/[0.05] px-3.5 py-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b95a1]">
                {copy.globe.placeActionGraphEyebrow}
              </p>
              <h3 className="truncate text-[17px] font-bold tracking-tight text-[#191f28]">
                {entity.titleKo}
              </h3>
              <p className="truncate text-[12px] text-[#515154]">{factsLine}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 rounded-full p-1.5 text-[#8b95a1] transition hover:bg-black/[0.04] hover:text-[#191f28]"
              aria-label={copy.globe.placeActionGraphCloseAria}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
            <section className="space-y-1.5" data-place-explore-ai-next>
              <p className="text-[11px] font-semibold text-[#1d1d1f]">
                {copy.globe.placeActionGraphAiNextTitle}
              </p>
              <div className="flex flex-col gap-1.5">
                {graph.aiNext.map((node, index) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleAiNext(node)}
                    className="flex items-center gap-2.5 rounded-xl bg-[#f5f5f7] px-3 py-2.5 text-left ring-1 ring-black/[0.04] transition active:scale-[0.99]"
                    data-place-explore-ai-next-index={index}
                  >
                    <span className="text-[18px]" aria-hidden>
                      {node.emoji}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-semibold tracking-tight text-[#191f28]">
                      {node.labelKo}
                    </span>
                    <span className="text-[10px] font-medium text-[#8b95a1]">
                      {index + 1}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <Section
              title={copy.globe.placeActionGraphKnowledgeTitle}
              nodes={graph.knowledge}
              onNode={handleKnowledge}
            />
            <Section
              title={copy.globe.placeActionGraphExploreTitle}
              nodes={graph.explore}
              onNode={onExploreNode}
            />
            <Section
              title={copy.globe.placeActionGraphActionsTitle}
              nodes={graph.actions}
              onNode={onActionNode}
            />
          </div>
        </div>
      </GlobeBrainSurfaceFloatingFrame>
    </div>
  );
}
