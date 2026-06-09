"use client";

import { memo } from "react";
import { useGlobeEarthTexture } from "@/hooks/use-globe-earth-texture";
import { cn } from "@/lib/utils";

export type GlobeEarthSurfaceProps = {
  className?: string;
};

/**
 * Full-earth equirectangular satellite surface (2:1).
 * Pins and pan math use the same projection via projectLatLngToMapPercent.
 */
export const GlobeEarthSurface = memo(function GlobeEarthSurface({
  className,
}: GlobeEarthSurfaceProps) {
  const { textureUrl, loading, error } = useGlobeEarthTexture();

  return (
    <div className={cn("absolute inset-0 overflow-hidden rounded-full", className)}>
      {loading ? (
        <div
          className="absolute inset-0 animate-pulse rounded-full bg-[#142238]"
          aria-hidden
        />
      ) : null}

      {textureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={textureUrl}
          alt=""
          draggable={false}
          className="absolute left-0 top-0 h-full w-[200%] max-w-none select-none object-cover brightness-[1.04] contrast-[1.06] saturate-[1.1]"
          decoding="async"
        />
      ) : error ? (
        <div className="absolute inset-0 rounded-full bg-[#142238]" aria-hidden />
      ) : null}

      <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-satellite-shade" />
      <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-atmosphere" />
      <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-terminator" />
      <div className="pointer-events-none absolute inset-0 rounded-full rimvio-globe-earth-limb" />

      <p className="pointer-events-none absolute bottom-2 right-2 text-[7px] font-medium text-white/40">
        © Esri · Maxar
      </p>
    </div>
  );
});
