"use client";



import { memo } from "react";

import { GlobeExperienceSlotPin } from "@/components/experience/globe-experience-slot-pin";
import { GlobeMapLayer } from "@/components/experience/globe-map-layer";
import type { GlobeSpaceBlob } from "@/lib/experience-graph/build-globe-space-blobs";
import type { ClassifiedGlobePin } from "@/lib/feed/experience-globe-ping-types";
import { mapPercentToLatLng } from "@/lib/experience-graph/resolve-place-coordinates";
import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";
import { cn } from "@/lib/utils";

const PIN_KIND_CLASS: Record<ClassifiedGlobePin["kind"], string> = {
  photo: "bg-emerald-300/90 shadow-[0_0_12px_rgba(52,211,153,0.85)]",
  video: "bg-violet-300/90 shadow-[0_0_12px_rgba(167,139,250,0.85)]",
  gps: "bg-sky-400/85 shadow-[0_0_10px_rgba(56,189,248,0.75)]",
  dwell: "bg-amber-300/90 shadow-[0_0_12px_rgba(251,191,36,0.8)]",
  place: "bg-white/75 shadow-[0_0_10px_rgba(255,255,255,0.45)]",
};

const PIN_KIND_CLASS_SATELLITE: Record<ClassifiedGlobePin["kind"], string> = {
  photo: "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,1)] ring-2 ring-white/90",
  video: "bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,1)] ring-2 ring-white/90",
  gps: "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,1)] ring-2 ring-white/85",
  dwell: "bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,1)] ring-2 ring-white/90",
  place: "bg-white shadow-[0_0_14px_rgba(255,255,255,0.9)] ring-2 ring-white/80",
};



export type SpatialGlobeStageProps = {

  globe: SpatialGlobeView;

  timeLabel?: string | null;

  environmentLabel?: string | null;

  blobs?: readonly GlobeSpaceBlob[];

  activeBlobId?: string | null;

  onBlobPress?: (blobId: string) => void;

  classifiedPins?: readonly ClassifiedGlobePin[];

  activePinId?: string | null;

  onPinPress?: (pinId: string) => void;

  /** Tap empty map — shared ROOM globe pin placement. */
  onMapPress?: (coords: { lat: number; lng: number; pinX: number; pinY: number }) => void;

  variant?: "card" | "immersive";

  /** Hide place/time/environment chips — globe-first home. */
  hideSyncMeta?: boolean;

  /** Immersive hub — hide center crosshair when pins carry context. */
  hideCenterCrosshair?: boolean;

  className?: string;

};



/** Rimvio globe — location, time, and environment stay synced; blobs tappable on immersive hub. */

export const SpatialGlobeStage = memo(function SpatialGlobeStage({

  globe,

  timeLabel,

  environmentLabel,

  blobs = [],

  activeBlobId,

  onBlobPress,

  classifiedPins = [],

  activePinId,

  onPinPress,

  onMapPress,

  variant = "card",

  hideSyncMeta = false,

  hideCenterCrosshair = false,

  className,

}: SpatialGlobeStageProps) {

  const translateX = 50 - globe.pinX;

  const translateY = 50 - globe.pinY;

  const immersive = variant === "immersive";
  const satellite = true;
  const pinKindClass = PIN_KIND_CLASS_SATELLITE;



  return (

    <div

      className={cn(

        "relative overflow-hidden",

        immersive
          ? "rimvio-globe-space min-h-[min(62vh,560px)] rounded-none border-0"
          : "rimvio-globe-space min-h-[min(36vh,320px)] rounded-2xl border border-white/10 shadow-sm",

        className,

      )}

      data-spatial-globe-stage

      data-spatial-globe-variant={variant}

      data-spatial-lat={globe.lat}

      data-spatial-lng={globe.lng}

    >

      <div className="pointer-events-none absolute inset-0 rimvio-globe-stars" aria-hidden />



      <div

        className={cn(

          "relative w-full",

          immersive ? "min-h-[min(62vh,560px)]" : "aspect-[16/10]",

        )}

      >

        {immersive ? (
          <div
            className="pointer-events-none absolute left-1/2 top-[46%] size-[min(98vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.14)_0%,rgba(37,99,235,0.06)_42%,transparent_72%)]"
            aria-hidden
          />
        ) : null}

        <div

          className={cn(

            "absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full transition-transform duration-[1200ms] ease-out",

            immersive
              ? "rimvio-globe-sphere-aura size-[min(94vw,420px)] border bg-[#050810]"
              : "rimvio-globe-sphere-aura size-[min(88vw,340px)] border bg-[#050810]",

          )}

          style={{ transform: `translate(-50%, -50%) scale(${globe.zoom})` }}

          aria-hidden

        >

          <div
            className={cn(
              "absolute inset-0 rounded-full transition-transform duration-[1200ms] ease-out",
              onMapPress && "cursor-crosshair",
            )}
            style={{
              transform: `translate(${translateX}%, ${translateY}%) scale(${immersive ? 1.42 : 1.35})`,
            }}
            data-globe-map-surface
            onClick={
              onMapPress
                ? (event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const pinX = ((event.clientX - rect.left) / rect.width) * 100;
                    const pinY = ((event.clientY - rect.top) / rect.height) * 100;
                    const { lat, lng } = mapPercentToLatLng(pinX, pinY);
                    onMapPress({ lat, lng, pinX, pinY });
                  }
                : undefined
            }
          >
            <div
              className={cn(
                "absolute inset-0 rounded-full",
                "rimvio-globe-spin",
              )}
            >
            <GlobeMapLayer
              lat={globe.lat}
              lng={globe.lng}
              globeZoom={globe.zoom}
              tileStyle="satellite"
            />

            {blobs.map((blob) => {
              const active = blob.id === activeBlobId;
              const left = `${blob.pinX}%`;
              const top = `${blob.pinY}%`;
              return (
                <button
                  key={blob.id}
                  type="button"
                  className={cn(
                    "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500",
                    active
                      ? "size-4 bg-sky-200 shadow-[0_0_22px_rgba(186,230,253,1)] ring-2 ring-white"
                      : "size-2.5 bg-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.8)] hover:size-3.5",
                  )}
                  style={{ left, top }}
                  data-globe-space-blob={blob.id}
                  aria-label={`${blob.label} 경험 ${blob.experienceCount}개`}
                  aria-pressed={active}
                  onClick={(event) => {
                    event.stopPropagation();
                    onBlobPress?.(blob.id);
                  }}
                />
              );
            })}

            {classifiedPins.map((pin) => {
              const active = pin.id === activePinId;
              const related = pin.emphasis === "related";
              const isSlot = pin.pinShape === "slot" && pin.slot;

              if (isSlot) {
                return (
                  <button
                    key={pin.id}
                    type="button"
                    className="absolute z-[12] -translate-x-1/2 -translate-y-full"
                    style={{ left: `${pin.pinX}%`, top: `${pin.pinY}%` }}
                    data-globe-classified-pin={pin.id}
                    data-globe-pin-shape="slot"
                    aria-label={`${pin.slot!.experienceTitle} · 사진 ${pin.slot!.photoCount} · 영상 ${pin.slot!.videoCount}`}
                    aria-pressed={active}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPinPress?.(pin.id);
                    }}
                  >
                    <GlobeExperienceSlotPin
                      slot={pin.slot!}
                      active={active}
                      related={related}
                    />
                  </button>
                );
              }

              return (
                <button
                  key={pin.id}
                  type="button"
                  className={cn(
                    "absolute z-[11] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500",
                    related ? "opacity-55" : "opacity-100",
                    active ? "size-3.5 ring-2 ring-white" : "size-2 hover:size-2.5",
                    pinKindClass[pin.kind],
                  )}
                  style={{ left: `${pin.pinX}%`, top: `${pin.pinY}%` }}
                  data-globe-classified-pin={pin.id}
                  data-globe-pin-kind={pin.kind}
                  aria-label={`${pin.label} · ${pin.kind}`}
                  aria-pressed={active}
                  onClick={(event) => {
                    event.stopPropagation();
                    onPinPress?.(pin.id);
                  }}
                />
              );
            })}

            </div>
          </div>

        </div>



        {hideCenterCrosshair ? null : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

          <div className="relative translate-y-2">

            <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-foreground ring-1 ring-primary/20">

              {globe.placeLabel}

            </span>

            <span className="block size-4 rounded-full bg-primary shadow-[0_0_16px_rgba(88,101,242,0.45)] ring-2 ring-white" />

            <span className="absolute left-1/2 top-4 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-primary/70 to-transparent" />

          </div>

        </div>
        )}



      </div>



      {hideSyncMeta ? null : (
      <div

        className={cn(

          "border-t border-border px-3 py-2.5",

          immersive && "bg-white/80 backdrop-blur-sm",

        )}

      >

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">

          <span

            className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-foreground"

            data-spatial-sync-place

          >

            📍 {globe.placeLabel}

          </span>

          {timeLabel ? (

            <span

              className="rounded-full border border-border bg-muted px-2 py-0.5 text-foreground/80 transition-opacity duration-500"

              data-spatial-sync-time

            >

              🕐 {timeLabel}

            </span>

          ) : null}

          {environmentLabel ? (

            <span

              className="rounded-full border border-[var(--rimvio-highlight-green)]/25 bg-[var(--rimvio-highlight-green)]/10 px-2 py-0.5 text-foreground/80 transition-opacity duration-500"

              data-spatial-sync-environment

            >

              🌤 {environmentLabel}

            </span>

          ) : null}

        </div>

      </div>
      )}

    </div>

  );

});


