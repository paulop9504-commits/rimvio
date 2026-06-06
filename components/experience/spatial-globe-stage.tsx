"use client";



import { memo } from "react";

import type { GlobeSpaceBlob } from "@/lib/experience-graph/build-globe-space-blobs";

import type { SpatialGlobeView } from "@/lib/experience-graph/spatial-media-types";

import { cn } from "@/lib/utils";



export type SpatialGlobeStageProps = {

  globe: SpatialGlobeView;

  timeLabel?: string | null;

  environmentLabel?: string | null;

  blobs?: readonly GlobeSpaceBlob[];

  activeBlobId?: string | null;

  onBlobPress?: (blobId: string) => void;

  variant?: "card" | "immersive";

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

  variant = "card",

  className,

}: SpatialGlobeStageProps) {

  const translateX = 50 - globe.pinX;

  const translateY = 50 - globe.pinY;

  const immersive = variant === "immersive";



  return (

    <div

      className={cn(

        "relative overflow-hidden bg-[#04060c]",

        immersive

          ? "min-h-[min(58vh,520px)] rounded-none border-0"

          : "rounded-2xl border border-sky-400/20",

        className,

      )}

      data-spatial-globe-stage

      data-spatial-globe-variant={variant}

      data-spatial-lat={globe.lat}

      data-spatial-lng={globe.lng}

    >

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(56,189,248,0.22),transparent_58%)]" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(167,139,250,0.12),transparent_32%)]" />



      <div

        className={cn(

          "relative w-full",

          immersive ? "min-h-[min(58vh,520px)]" : "aspect-[16/10]",

        )}

      >

        <div

          className={cn(

            "absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300/20 bg-[radial-gradient(circle_at_30%_24%,#2563eb_0%,#0c1929_38%,#03050a_100%)] shadow-[inset_0_0_80px_rgba(125,211,252,0.16),0_0_60px_rgba(56,189,248,0.12)] transition-transform duration-700 ease-out",

            immersive ? "size-[min(92vw,380px)] animate-[rimvio-globe-idle_48s_linear_infinite]" : "size-[145%]",

          )}

          style={{ transform: `translate(-50%, -50%) scale(${globe.zoom})` }}

          aria-hidden

        >

          <div

            className="absolute inset-0 rounded-full transition-transform duration-700 ease-out"

            style={{

              transform: `translate(${translateX}%, ${translateY}%) scale(1.35)`,

            }}

          >

            <div className="absolute inset-0 rounded-full opacity-85 [background-image:radial-gradient(circle_at_22%_34%,rgba(74,222,128,0.42)_0%,transparent_22%),radial-gradient(circle_at_58%_40%,rgba(56,189,248,0.34)_0%,transparent_20%),radial-gradient(circle_at_76%_64%,rgba(34,197,94,0.26)_0%,transparent_18%),linear-gradient(180deg,rgba(125,211,252,0.1),transparent_48%)]" />

            <div className="absolute inset-0 rounded-full opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />



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

                  onClick={() => onBlobPress?.(blob.id)}

                />

              );

            })}

          </div>

        </div>



        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">

          <div className="relative translate-y-2">

            <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sky-500/25 px-2.5 py-0.5 text-[11px] font-bold text-sky-50 ring-1 ring-sky-300/30">

              {globe.placeLabel}

            </span>

            <span className="block size-4 rounded-full bg-sky-200 shadow-[0_0_24px_rgba(186,230,253,1)] ring-2 ring-white" />

            <span className="absolute left-1/2 top-4 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-sky-100/90 to-transparent" />

          </div>

        </div>



        {immersive ? (

          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white/70">

            RIMVIO GLOBE

          </div>

        ) : null}

      </div>



      <div

        className={cn(

          "border-t border-white/8 px-3 py-2.5",

          immersive && "bg-black/35 backdrop-blur-sm",

        )}

      >

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">

          <span

            className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-sky-100/92"

            data-spatial-sync-place

          >

            📍 {globe.placeLabel}

          </span>

          {timeLabel ? (

            <span

              className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-violet-100/92 transition-opacity duration-500"

              data-spatial-sync-time

            >

              🕐 {timeLabel}

            </span>

          ) : null}

          {environmentLabel ? (

            <span

              className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-100/92 transition-opacity duration-500"

              data-spatial-sync-environment

            >

              🌤 {environmentLabel}

            </span>

          ) : null}

        </div>

      </div>

    </div>

  );

});


