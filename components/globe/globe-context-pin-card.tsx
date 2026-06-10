"use client";

import type { RefObject } from "react";
import type { RimvioGlobeHubHandle } from "@/components/experience/rimvio-globe-hub";
import { useGlobePinScreenAnchor } from "@/hooks/use-globe-pin-screen-anchor";
import { projectExperienceHeroFromCluster } from "@/lib/globe/project-experience-hero";
import type { PinCluster } from "@/lib/globe/pin-cluster-types";
import { cn } from "@/lib/utils";

export type GlobeContextPinCardProps = {
  cluster: PinCluster | null;
  globeRef: RefObject<RimvioGlobeHubHandle | null>;
  visible?: boolean;
  onOpenSheet?: () => void;
  onDismiss?: () => void;
  className?: string;
};

/** P0 — compact context card anchored above the selected pin. */
export function GlobeContextPinCard({
  cluster,
  globeRef,
  visible = true,
  onOpenSheet,
  onDismiss,
  className,
}: GlobeContextPinCardProps) {
  const hero = cluster ? projectExperienceHeroFromCluster(cluster) : null;
  const anchor = useGlobePinScreenAnchor({
    globeRef,
    lat: cluster?.lat,
    lng: cluster?.lng,
    enabled: visible && Boolean(cluster),
  });

  if (!visible || !cluster || !hero) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[21] overflow-hidden",
        className,
      )}
      data-globe-context-pin-card
    >
      {anchor ? (
        <div
          className="pointer-events-auto absolute max-w-[min(72vw,280px)]"
          style={{
            left: anchor.x,
            top: anchor.y,
            transform: "translate(-50%, calc(-100% - 12px))",
            width: Math.max(160, Math.min(anchor.widthPx * 1.6, 280)),
          }}
        >
          <button
            type="button"
            className={cn(
              "w-full rounded-[1.1rem] border border-white/90 bg-card/95 p-3 text-left",
              "shadow-[0_10px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur-md",
              "active:scale-[0.99]",
            )}
            onClick={onOpenSheet}
          >
            <p className="line-clamp-1 text-[14px] font-bold text-foreground">
              {hero.title}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
              {[hero.date, hero.place].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {hero.photoCount > 0 ? (
                <span className="rounded-full bg-[var(--rimvio-highlight-green)]/15 px-2 py-0.5 text-[10px] font-semibold">
                  📷 {hero.photoCount}
                </span>
              ) : null}
              {hero.videoCount > 0 ? (
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  ▶ {hero.videoCount}
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {hero.place}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-semibold text-primary">
              탭해서 자세히 보기
            </p>
          </button>
          {onDismiss ? (
            <button
              type="button"
              className="mt-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm"
              onClick={onDismiss}
            >
              닫기
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
