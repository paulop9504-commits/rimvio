"use client";

/**
 * Workspace Preview — chat-embedded map + hotel cards.
 * 펼치기 / map tap → Open Workspace (full Context Workspace).
 */

import type { WorkspacePreviewComposePayload } from "@/lib/globe/assistant/context-agent-compose-thread-store";
import { dispatchContextWorkspaceExpand } from "@/lib/context-workspace/workspace-expand-bridge";
import { domainLabelKo } from "@/lib/context-workspace/types";
import { WorkspaceMapView } from "@/components/context-workspace/workspace-map-view";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type ContextWorkspacePreviewCardProps = {
  contextEventId: string;
  payload: WorkspacePreviewComposePayload;
  className?: string;
};

function formatRating(rating: number | null): string {
  if (rating == null || !Number.isFinite(rating)) {
    return "—";
  }
  return rating.toFixed(1);
}

function formatPrice(node: WorkspacePreviewComposePayload["nodes"][number]): string {
  if (node.amountLabel?.trim()) {
    return node.amountLabel.trim();
  }
  if (node.priceBand != null) {
    return `가격대 ${node.priceBand}`;
  }
  return "가격 미정";
}

export function ContextWorkspacePreviewCard({
  contextEventId,
  payload,
  className,
}: ContextWorkspacePreviewCardProps) {
  const openWorkspace = (source: "preview_expand" | "preview_map_tap") => {
    dispatchContextWorkspaceExpand({
      contextEventId,
      source,
    });
  };

  const cards = payload.nodes.slice(0, 4);
  const pins = payload.nodes.map((n) => ({
    id: n.id,
    title: n.title,
    lat: n.lat,
    lng: n.lng,
    rating: n.rating,
  }));

  return (
    <div
      className={cn(
        "w-full max-w-[min(100%,360px)] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/8",
        className,
      )}
      data-workspace-preview
    >
      <div className="relative h-44">
        <WorkspaceMapView
          pins={pins}
          compact
          onBackgroundActivate={() => openWorkspace("preview_map_tap")}
          onSelectPin={() => openWorkspace("preview_map_tap")}
        />
        <button
          type="button"
          className="absolute right-2 top-2 z-[2] rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm ring-1 ring-black/8"
          onClick={() => openWorkspace("preview_expand")}
        >
          {copy.globe.workspacePreviewExpand}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto px-2.5 py-2.5">
        {cards.map((node) => (
          <button
            key={node.id}
            type="button"
            className="w-[148px] shrink-0 rounded-xl bg-muted/40 p-2 text-left ring-1 ring-black/5"
            onClick={() => openWorkspace("preview_expand")}
          >
            <div className="mb-1.5 h-16 rounded-lg bg-gradient-to-br from-slate-200 to-slate-100" />
            <p className="line-clamp-2 text-[12px] font-semibold leading-snug">
              {node.title}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              ★ {formatRating(node.rating)} ·{" "}
              {domainLabelKo(
                node.kind ?? payload.domain ?? "lodging",
              )}
            </p>
            <p className="mt-0.5 text-[12px] font-medium text-foreground">
              {formatPrice(node)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
