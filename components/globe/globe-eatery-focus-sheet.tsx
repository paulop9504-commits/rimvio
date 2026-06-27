"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { readEateryRecommendReason } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import {
  subscribeGlobeEateryFocus,
  type GlobeEateryFocusDetail,
} from "@/lib/globe/eatery/globe-eatery-focus-bridge";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeEateryFocusSheetProps = {
  eventId: string | null;
  className?: string;
};

export function GlobeEateryFocusSheet({ eventId, className }: GlobeEateryFocusSheetProps) {
  const [focus, setFocus] = useState<GlobeEateryFocusDetail | null>(null);

  useEffect(() => {
    return subscribeGlobeEateryFocus((detail) => {
      setFocus(detail);
    });
  }, []);

  const event = eventId ? findLifeEventCandidate(eventId) : null;
  const rows = event ? readEateryInventoryRows(event) : [];
  const row = useMemo(() => {
    if (!focus || !eventId) {
      return null;
    }
    const placeId = focus.resourceId.split(":eatery:")[1];
    return rows.find((entry) => entry.placeId === placeId || `${eventId}:eatery:${entry.placeId}` === focus.resourceId) ?? null;
  }, [eventId, focus, rows]);

  const reason = row && eventId ? readEateryRecommendReason(eventId, row.placeId) : null;

  if (!focus || !row) {
    return null;
  }

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${encodeURIComponent(row.placeId)}`;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-[29] flex justify-center px-4",
        className,
      )}
      style={{ bottom: "calc(var(--rimvio-globe-ingest-offset, 5.5rem) + 9.5rem)" }}
      data-globe-eatery-focus-sheet
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-[1rem] bg-[#121316]/92 p-3.5 ring-1 ring-white/12 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ff9500]/90">
              {copy.globe.eateryReasonCardTitle}
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold text-white">{row.name}</p>
          </div>
          <button
            type="button"
            onClick={() => setFocus(null)}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80"
            aria-label={copy.globe.eateryFocusCloseAria}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-white/82">
          {reason?.reasonKo ?? copy.globe.eateryReasonFallback}
        </p>
        {reason?.matchReasons && reason.matchReasons.length > 1 ? (
          <ul className="mt-2 space-y-1">
            {reason.matchReasons.slice(1).map((line) => (
              <li key={line} className="text-[11px] text-white/65">
                · {line}
              </li>
            ))}
          </ul>
        ) : null}
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center rounded-full bg-[#ff9500] px-4 py-2.5 text-[13px] font-semibold text-white active:opacity-90"
        >
          {copy.globe.eateryFocusNavigate}
        </a>
      </div>
    </div>
  );
}
