"use client";

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { readGlobeContextCardCoords, resolveGlobeContextPlaceLabel } from "@/lib/globe/globe-context-card-coords";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { buildKakaoMapRouteWebHref } from "@/lib/resolvers/deep-links";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type PeerContextMiniMapProps = {
  eventId: string | null | undefined;
  title?: string | null;
  className?: string;
};

/** Tier 2 — compact place strip for peer threads tied to a globe context. */
export function PeerContextMiniMap({ eventId, title, className }: PeerContextMiniMapProps) {
  const event = useMemo(() => {
    const id = eventId?.trim();
    if (!id) {
      return null;
    }
    return findLifeEventCandidate(id);
  }, [eventId]);

  const coords = useMemo(() => {
    if (!event) {
      return null;
    }
    try {
      return readGlobeContextCardCoords(event);
    } catch {
      return null;
    }
  }, [event]);

  if (!event || !coords) {
    return null;
  }

  const label = title?.trim() || resolveGlobeContextPlaceLabel(event);
  const mapHref = buildKakaoMapRouteWebHref({
    lat: coords.lat,
    lng: coords.lng,
    placeLabel: label,
  });

  return (
    <a
      href={mapHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mx-3 mb-2 flex items-center gap-2 rounded-2xl bg-[#f2f4f6]/90 px-3 py-2",
        "text-[12px] font-medium text-[#4e5968] ring-1 ring-black/[0.05] active:bg-[#e8eaed]",
        className,
      )}
      data-peer-context-mini-map
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <MapPin className="size-4 text-[#3182f6]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-[11px] font-semibold text-[#3182f6]">
        {copy.globe.contextTriggerOpenHint}
      </span>
    </a>
  );
}
