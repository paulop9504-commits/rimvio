"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { GlobeBrainSurfaceFloatingFrame } from "@/components/globe/globe-brain-surface-floating-frame";
import { GlobeMapFocusMediaContextPanel } from "@/components/globe/globe-map-focus-media-context-panel";
import { GlobeMapFocusMediaShell } from "@/components/globe/globe-map-focus-media-shell";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import {
  buildBrainSurfaceMapFocusPanelContent,
  resolveSatelliteHint,
} from "@/lib/globe/build-map-focus-media-context-panel";
import { layoutBrainSurfaceOntologyPeek } from "@/lib/globe/layout-brain-surface-ontology-peek";
import {
  GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS,
  GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX,
} from "@/lib/globe/globe-map-focus-hero-layout";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";
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
  mediaGuide?: MediaGuideNode | null;
  activeRelatedId?: string | null;
  onSelectRelated: (candidateId: string) => void;
  onExpandMap?: (() => void) | null;
  inferredPlaceCount?: number;
  onOpenDetail?: (() => void) | null;
  onClose: () => void;
  globeRef?: RefObject<RimvioGlobeHubHandle | null>;
  className?: string;
};

export function GlobeBrainSurfaceOntologyPeek({
  anchor,
  related,
  mediaGuide = null,
  activeRelatedId,
  onSelectRelated,
  onExpandMap = null,
  inferredPlaceCount,
  onOpenDetail = null,
  onClose,
  globeRef,
  className,
}: GlobeBrainSurfaceOntologyPeekProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [youtubeStartSeconds, setYoutubeStartSeconds] = useState<number | null>(null);
  const thumb = anchor.markerThumbnailUrl?.trim() || null;
  const embedUrl = anchor.embedUrl?.trim() || null;
  const embedKey = (embedUrl ? extractYouTubeVideoId(embedUrl) : null) ?? anchor.id;

  const panelContent = useMemo(
    () =>
      buildBrainSurfaceMapFocusPanelContent({
        anchor,
        related,
        mediaGuide,
        inferredPlaceCount,
        canExpandMap: Boolean(onExpandMap),
        canOpenDetail: Boolean(onOpenDetail),
      }),
    [anchor, related, mediaGuide, inferredPlaceCount, onExpandMap, onOpenDetail],
  );

  const pinLayout = useGlobePinScreenAnchor({
    globeRef: globeRef ?? { current: null },
    lat: anchor.lat,
    lng: anchor.lng,
    enabled: Boolean(embedUrl || thumb),
    containerRef,
  });
  const pinAnchored = pinLayout?.onScreen === true;

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

  const ontologyGraph =
    satellites.length > 0 ? (
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
          const hint = resolveSatelliteHint(row);
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
                  ? "items-center justify-center rounded-[0.9rem] border px-1.5 py-1.5 shadow-sm ring-1 ring-slate-200/80"
                  : "rounded-[0.85rem] border shadow-sm ring-1 ring-slate-200/80",
                "border-slate-200/80 bg-white text-slate-900",
                active ? "border-[#0071e3]/55 ring-2 ring-[#0071e3]/20" : "",
                dragging && "z-[5] scale-[1.03] cursor-grabbing shadow-md ring-2 ring-[#0071e3]/30",
                armed && !dragging && "scale-[1.02] ring-2 ring-slate-300",
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
                      <span className={cn("size-1.5 rounded-full", familyAccent(row.family))} />
                      <p className="mt-1 line-clamp-2 w-full text-center text-[9px] font-semibold leading-tight text-slate-800">
                        {row.label}
                      </p>
                      {hint ? (
                        <p className="mt-0.5 line-clamp-2 w-full text-center text-[8px] leading-tight text-slate-500">
                          {hint}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[8px] font-medium text-slate-500">
                          {familyLabel(row.family)}
                        </p>
                      )}
                    </>
                  ) : (
                <>
                  <div className="relative h-[2.15rem] w-full shrink-0 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={nodeThumb}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                      <p className="line-clamp-2 flex-1 px-1.5 py-1 text-[9px] font-semibold leading-tight text-slate-800">
                        {row.label}
                      </p>
                      {hint ? (
                        <p className="line-clamp-2 px-1.5 pb-1 text-[8px] leading-tight text-slate-500">
                          {hint}
                        </p>
                      ) : null}
                </>
              )}
            </button>
          );
        })}
      </div>
    ) : null;

  const handlePrimaryAction = useCallback(() => {
    const action = panelContent.primaryAction;
    if (!action) {
      return;
    }
    if (action.kind === "expand_map") {
      onExpandMap?.();
      return;
    }
    if (action.kind === "play_moment") {
      const seconds = panelContent.sceneMoments[0]?.seconds;
      if (seconds != null) {
        setYoutubeStartSeconds(seconds);
      }
      return;
    }
    if (action.kind === "open_detail") {
      onOpenDetail?.();
    }
  }, [onExpandMap, onOpenDetail, panelContent.primaryAction, panelContent.sceneMoments]);

  const handleSecondaryAction = useCallback(() => {
    const action = panelContent.secondaryAction;
    if (!action) {
      return;
    }
    if (action.kind === "play_moment") {
      const seconds = panelContent.sceneMoments[0]?.seconds;
      if (seconds != null) {
        setYoutubeStartSeconds(seconds);
      }
      return;
    }
    if (action.kind === "open_detail") {
      onOpenDetail?.();
    }
  }, [onOpenDetail, panelContent.sceneMoments, panelContent.secondaryAction]);

  const framelessVideo = (
    <GlobeMapFocusMediaShell
      className={GLOBE_MAP_FOCUS_CARD_MAX_WIDTH_CLASS}
      variant="frameless"
      showMetadataOverlay={false}
      title={anchor.label}
      thumbnailUrl={thumb}
      youtubeEmbedUrl={embedUrl}
      youtubeVideoKey={`${embedKey}:${youtubeStartSeconds ?? 0}`}
      youtubeStartSeconds={youtubeStartSeconds}
      autoPlay
      onClose={onClose}
      closeAriaLabel={copy.globe.brainSurfaceStoryCloseAria}
    />
  );

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 z-[31] overflow-hidden", className)}
      data-globe-brain-surface-ontology-peek
    >
      {pinAnchored && pinLayout ? (
        <div
          className="pointer-events-auto absolute z-[1]"
          style={{
            left: pinLayout.x,
            top: pinLayout.y,
            transform: `translate(-50%, calc(-100% - ${GLOBE_MAP_FOCUS_PIN_ANCHOR_OFFSET_PX}px))`,
          }}
          data-globe-brain-surface-ontology-video-anchor
        >
          {framelessVideo}
        </div>
      ) : (
        <div
          className="pointer-events-auto absolute inset-x-0 top-[min(18vh,7.5rem)] z-[1] flex justify-center px-3"
          data-globe-brain-surface-ontology-video-fallback
        >
          {framelessVideo}
        </div>
      )}

      <div
        className="pointer-events-auto absolute right-2 z-[2] max-[380px]:inset-x-2 max-[380px]:bottom-[calc(var(--rimvio-globe-ingest-offset,5.5rem)+0.4rem)] max-[380px]:right-auto"
        style={{
          bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 0.4rem)",
          maxWidth: "min(22rem, calc(100vw - 1rem))",
        }}
      >
        <GlobeBrainSurfaceFloatingFrame
          frameId="brain-surface-info"
          dragLabel="맥락 정보 이동"
          floating={false}
          shellClassName="overflow-hidden rounded-b-[1rem] rounded-t-none border border-t-0 border-white/85 bg-transparent text-slate-900 shadow-none ring-0"
          bodyClassName="p-0"
        >
          <GlobeMapFocusMediaContextPanel
            content={panelContent}
            onClose={onClose}
            closeAriaLabel={copy.globe.brainSurfaceStoryCloseAria}
            onPrimaryAction={handlePrimaryAction}
            onSecondaryAction={handleSecondaryAction}
            onMomentPress={(seconds) => setYoutubeStartSeconds(seconds)}
          >
            {ontologyGraph}
          </GlobeMapFocusMediaContextPanel>
        </GlobeBrainSurfaceFloatingFrame>
      </div>
    </div>
  );
}
