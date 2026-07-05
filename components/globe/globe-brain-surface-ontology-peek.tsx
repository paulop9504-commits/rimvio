"use client";

import { useCallback, useMemo } from "react";
import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
import { GlobeMediaGuideMapExpandButton } from "@/components/globe/globe-media-guide-map-expand-button";
import { resolveBrainSurfaceClosureLine } from "@/lib/globe/resolve-brain-surface-closure-line";
import { layoutBrainSurfaceOntologyPeek } from "@/lib/globe/layout-brain-surface-ontology-peek";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
} from "@/lib/globe/globe-map-focus-hero-layout";
import type { BrainSurfaceProjectionCandidate } from "@/lib/situation-projection/brain-surface-types";
import { extractYouTubeVideoId } from "@/lib/enrichers/youtube-url";
import { useOntologyGraphNodeDrag } from "@/hooks/use-ontology-graph-node-drag";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

function familyLabel(family: BrainSurfaceProjectionCandidate["family"]): string {
  switch (family) {
    case "media":
      return "영상";
    case "eatery":
      return "맛집";
    case "lodging":
      return "숙소";
    case "trace_place":
      return "장소";
    case "info":
      return "정보";
    case "event":
      return "행사";
    case "memo":
    default:
      return "메모";
  }
}

function familyAccent(family: BrainSurfaceProjectionCandidate["family"]): string {
  switch (family) {
    case "eatery":
      return "bg-orange-400";
    case "lodging":
      return "bg-emerald-400";
    case "media":
      return "bg-violet-400";
    case "trace_place":
      return "bg-sky-400";
    default:
      return "bg-slate-400";
  }
}

export type GlobeBrainSurfaceOntologyPeekProps = {
  anchor: BrainSurfaceProjectionCandidate;
  related: readonly BrainSurfaceProjectionCandidate[];
  activeRelatedId?: string | null;
  onSelectRelated: (candidateId: string) => void;
  onExpandMap?: (() => void) | null;
  inferredPlaceCount?: number;
  onOpenDetail?: (() => void) | null;
  onClose: () => void;
  className?: string;
};

export function GlobeBrainSurfaceOntologyPeek({
  anchor,
  related,
  activeRelatedId,
  onSelectRelated,
  onExpandMap = null,
  inferredPlaceCount,
  onOpenDetail = null,
  onClose,
  className,
}: GlobeBrainSurfaceOntologyPeekProps) {
  const thumb = anchor.markerThumbnailUrl?.trim() || null;
  const embedUrl = anchor.embedUrl?.trim() || null;
  const embedKey = (embedUrl ? extractYouTubeVideoId(embedUrl) : null) ?? anchor.id;
  const caption =
    anchor.previewBody?.trim() && anchor.previewBody.trim() !== anchor.label.trim()
      ? anchor.previewBody.trim()
      : null;
  const closureLine = resolveBrainSurfaceClosureLine(anchor);
  const mediaCaption = caption ?? closureLine;

  const satellites = useMemo(
    () => related.filter((row) => row.id !== anchor.id).slice(0, 8),
    [anchor.id, related],
  );

  const baseLayout = useMemo(
    () =>
      layoutBrainSurfaceOntologyPeek({
        satellites,
        width: 300,
        mediaExternal: true,
      }),
    [satellites],
  );

  const getBaseNodes = useCallback(
    () =>
      baseLayout.nodes.map((node) => ({
        id: node.candidateId,
        centerX: node.centerX,
        centerY: node.centerY,
        width: node.width,
        height: node.height,
      })),
    [baseLayout.nodes],
  );

  const {
    draggingNodeId,
    armedNodeId,
    bindNode,
    resolveLayout,
  } = useOntologyGraphNodeDrag({
    graphKey: `${anchor.id}:${satellites.map((row) => row.id).join("|")}`,
    getBaseNodes,
    onNodeTap: onSelectRelated,
    maxWidth: 360,
  });

  const layout = useMemo(() => {
    const separated = resolveLayout();
    return {
      width: separated.width,
      height: separated.height,
      rootStem: {
        x: separated.width / 2,
        y: baseLayout.rootStem.y,
      },
      nodes: separated.nodes.map((node) => ({
        candidateId: node.id,
        centerX: node.centerX,
        centerY: node.centerY,
        width: node.width,
        height: node.height,
      })),
    };
  }, [baseLayout.rootStem.y, resolveLayout]);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-x-0 z-[31] flex justify-center px-2",
        className,
      )}
      style={{
        bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.4rem)",
      }}
      data-globe-brain-surface-ontology-peek
    >
      <div className="flex w-full max-w-[22rem] flex-col items-center gap-2">
        <GlobeMapFocusMediaShell
          className={GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS}
          title={anchor.label}
          caption={mediaCaption}
          eyebrow={anchor.placeLabel}
          lat={anchor.lat}
          lng={anchor.lng}
          thumbnailUrl={thumb}
          youtubeEmbedUrl={embedUrl}
          youtubeVideoKey={embedKey}
          onClose={onClose}
          closeAriaLabel={copy.globe.brainSurfaceStoryCloseAria}
        />

        {satellites.length > 0 ? (
          <div
            className="relative w-full touch-none"
            style={{ height: layout.height, maxWidth: layout.width, marginInline: "auto" }}
            data-globe-brain-surface-ontology-graph
          >
            <svg
              className="pointer-events-none absolute inset-0 z-[1] overflow-visible"
              width={layout.width}
              height={layout.height}
              aria-hidden
              data-globe-brain-surface-ontology-links
            >
              {layout.nodes.map((node) => {
                const row = satellites.find((item) => item.id === node.candidateId);
                const active = node.candidateId === activeRelatedId;
                const virtual = row?.virtualCandidate === true;
                const inferred = row?.anchorKind === "inferred_place";
                return (
                  <line
                    key={`stem:${node.candidateId}`}
                    x1={layout.rootStem.x}
                    y1={layout.rootStem.y}
                    x2={node.centerX}
                    y2={node.centerY - node.height / 2 + 6}
                    stroke={
                      active
                        ? "rgba(0,113,227,0.82)"
                        : virtual
                          ? "rgba(148,163,184,0.38)"
                          : "rgba(255,255,255,0.28)"
                    }
                    strokeWidth={active ? 2 : 1.25}
                    strokeDasharray={inferred || virtual ? "4 3" : undefined}
                  />
                );
              })}
            </svg>

            {layout.nodes.map((node) => {
              const row = satellites.find((candidate) => candidate.id === node.candidateId);
              if (!row) {
                return null;
              }
              const active = row.id === activeRelatedId;
              const nodeThumb = row.markerThumbnailUrl?.trim();
              const compact = !nodeThumb || row.virtualCandidate;
              const dragging = draggingNodeId === row.id;
              const armed = armedNodeId === row.id;
              const dragBinding = bindNode(row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  {...dragBinding}
                  className={cn(
                    "pointer-events-auto absolute z-[2] flex touch-none flex-col overflow-hidden text-left select-none",
                    compact
                      ? "items-center justify-center rounded-[0.9rem] border px-1.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.32)] backdrop-blur-xl"
                      : "rounded-[0.85rem] border shadow-[0_8px_24px_rgba(0,0,0,0.32)] backdrop-blur-xl",
                    "border-white/14 bg-[#1d1d1f]/94 text-white",
                    active
                      ? "border-[#0071e3]/55 ring-2 ring-[#0071e3]/25"
                      : "border-white/14",
                    dragging && "z-[5] scale-[1.03] cursor-grabbing shadow-[0_12px_32px_rgba(0,113,227,0.28)] ring-2 ring-[#0071e3]/35",
                    armed && !dragging && "scale-[1.02] ring-2 ring-white/30",
                    !dragging && !armed && "active:scale-[0.98]",
                  )}
                  style={{
                    left: node.centerX - node.width / 2,
                    top: node.centerY - node.height / 2,
                    width: node.width,
                    height: node.height,
                  }}
                  aria-label={`${row.label} — ${copy.globe.brainSurfaceOntologyNodeDragHint}`}
                  data-globe-brain-surface-ontology-node={row.id}
                  data-globe-brain-surface-ontology-node-dragging={dragging ? "true" : "false"}
                >
                  {compact ? (
                    <>
                      <span
                        className={cn("size-1.5 rounded-full", familyAccent(row.family))}
                      />
                      <p className="mt-1 line-clamp-2 w-full text-center text-[9px] font-semibold leading-tight text-white/92">
                        {row.label}
                      </p>
                      <p className="mt-0.5 text-[8px] font-medium text-white/55">
                        {familyLabel(row.family)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="relative h-[2.15rem] w-full shrink-0 bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={nodeThumb}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      </div>
                      <p className="line-clamp-2 flex-1 px-1.5 py-1 text-[9px] font-semibold leading-tight text-white/92">
                        {row.label}
                      </p>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        {(onExpandMap || onOpenDetail) && (
          <div className="flex w-full flex-col items-center gap-1.5 px-0.5">
            {onExpandMap ? (
              <GlobeMediaGuideMapExpandButton
                variant="overlay"
                label={copy.globe.contextGuideExpandMap}
                candidateCount={inferredPlaceCount}
                onClick={onExpandMap}
                className="w-full"
              />
            ) : null}
            {onOpenDetail && !onExpandMap ? (
              <button
                type="button"
                onClick={onOpenDetail}
                className="flex w-full items-center justify-center rounded-full bg-black/52 px-3 py-2 text-[11px] font-semibold text-white ring-1 ring-white/12 backdrop-blur-md active:scale-[0.98]"
              >
                {copy.globe.contextGuideDisclosureDetail}
              </button>
            ) : onOpenDetail ? (
              <button
                type="button"
                onClick={onOpenDetail}
                className="text-[10px] font-semibold text-white/62 underline decoration-white/24 underline-offset-2 active:text-white/82"
              >
                {copy.globe.contextGuideDisclosureDetail}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
