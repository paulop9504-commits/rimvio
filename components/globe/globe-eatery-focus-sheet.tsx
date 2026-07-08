"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { GlobeContextConditionPinBar } from "@/components/globe/globe-context-condition-pin-bar";
import { GlobeContextQuickPinButton } from "@/components/globe/globe-context-quick-pin-button";
import { GlobePredictedExperienceCard } from "@/components/globe/globe-predicted-experience-card";
import { useActiveContextWeather } from "@/hooks/use-active-context-weather";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { publishBridgePinnedContextItem } from "@/lib/experience-bridge/publish-bridge-pinned-context-item";
import { isBridgeLinkedEventId } from "@/lib/experience-bridge/stamp-bridge-event-metadata";
import { readPinnedLodgingResourceId } from "@/lib/globe/context-hub/pin-lodging-selection-to-context";
import { readEateryRecommendReason } from "@/lib/globe/eatery/eatery-recommendation-reason-store";
import {
  subscribeGlobeEateryFocus,
  type GlobeEateryFocusDetail,
} from "@/lib/globe/eatery/globe-eatery-focus-bridge";
import { readLodgingInventoryRows } from "@/lib/globe/context-hub/read-lodging-resource-inventory";
import { readRecentGlobeLodgingFocusResourceId } from "@/lib/globe/context-hub/globe-lodging-marker-bridge";
import {
  subscribeGlobeEateryDiscoveryClose,
} from "@/lib/globe/eatery/globe-eatery-discovery-bridge";
import { buildEateryInfraActions } from "@/lib/globe/eatery/eatery-infra-actions";
import { offerEateryPreferenceLearn } from "@/lib/globe/eatery/offer-eatery-preference-learn";
import { readEateryInventoryRows } from "@/lib/globe/eatery/read-eatery-resource-inventory";
import {
  pinEaterySelectionToContext,
  readPinnedEateryResourceId,
} from "@/lib/globe/eatery/pin-eatery-selection-to-context";
import { describeLodgingEateryRelation } from "@/lib/globe/relation/describe-lodging-eatery-relation";
import { buildEateryPredictedExperienceCard } from "@/lib/globe/predicted-experience/build-predicted-experience-card";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeEateryFocusSheetProps = {
  eventId: string | null;
  className?: string;
};

export function GlobeEateryFocusSheet({ eventId, className }: GlobeEateryFocusSheetProps) {
  const [focus, setFocus] = useState<GlobeEateryFocusDetail | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    return subscribeGlobeEateryFocus((detail) => {
      setFocus(detail);
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeEateryDiscoveryClose(() => {
      setFocus(null);
    });
  }, []);

  const event = eventId ? findLifeEventCandidate(eventId) : null;
  const rows = useMemo(() => (event ? readEateryInventoryRows(event) : []), [event]);
  const lodgingRows = useMemo(
    () => (event ? readLodgingInventoryRows(event) : []),
    [event],
  );
  const row = useMemo(() => {
    if (!focus || !eventId) {
      return null;
    }
    const placeId =
      focus.resourceId.split(":activity:")[1] ??
      focus.resourceId.split(":amenity:")[1] ??
      focus.resourceId.split(":eatery:")[1];
    return (
      rows.find(
        (entry) =>
          entry.placeId === placeId ||
          `${eventId}:eatery:${entry.placeId}` === focus.resourceId ||
          `${eventId}:activity:${entry.placeId}` === focus.resourceId ||
          `${eventId}:amenity:${entry.placeId}` === focus.resourceId,
      ) ?? null
    );
  }, [eventId, focus, rows]);

  const reason = row && eventId ? readEateryRecommendReason(eventId, row.placeId) : null;
  const relationSummary = useMemo(() => {
    if (!event || !row || lodgingRows.length === 0) {
      return null;
    }
    return describeLodgingEateryRelation({
      event,
      eatery: row,
      lodgingRows,
      preferredLodgingResourceId:
        readPinnedLodgingResourceId(event) ?? readRecentGlobeLodgingFocusResourceId(event.id),
      now: new Date(),
    });
  }, [event, lodgingRows, row]);
  const pinnedResourceId = useMemo(
    () => readPinnedEateryResourceId(event),
    [event],
  );
  const { prepLine: weatherPrepLine } = useActiveContextWeather({
    event,
    enabled: Boolean(focus && event),
  });
  const isPinned = Boolean(
    row && eventId && pinnedResourceId === `${eventId}:eatery:${row.placeId}`,
  );
  const bridgeShared = Boolean(eventId && isBridgeLinkedEventId(eventId));

  if (!focus || !row) {
    return null;
  }

  const mapsHref =
    row.mapsUrl?.trim() ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name)}&query_place_id=${encodeURIComponent(row.placeId)}`;
  const metaLine = [
    row.providerLabel?.trim() || null,
    typeof row.rating === "number" ? `평점 ${row.rating.toFixed(1)}` : null,
    row.openNow == null ? null : row.openNow ? "영업 중" : "영업 종료",
  ]
    .filter(Boolean)
    .join(" · ");
  const infraActions = buildEateryInfraActions({
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    mapsUrl: row.mapsUrl,
    contextPlace: event?.place ?? null,
    contextTitle: event?.title ?? null,
  });
  const predictedExperience = buildEateryPredictedExperienceCard({
    name: row.name,
    recommendReason: reason?.reasonKo ?? null,
    recommendReasons: reason?.matchReasons ?? [],
    relationSummary,
    cuisineHint: row.cuisineHint ?? null,
    rating: row.rating ?? null,
    openNow: row.openNow ?? null,
    priceLevel: row.priceLevel ?? null,
    providerLabel: row.providerLabel ?? null,
    categoryLabel: row.categoryLabel ?? null,
    weatherPrepLine,
  });

  const openInfraHref = (href: string, fallbackHref?: string | null) => {
    const trimmed = href.trim();
    if (!trimmed) {
      return;
    }
    const isCustomScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed);
    if (!isCustomScheme) {
      window.open(trimmed, "_blank", "noopener,noreferrer");
      return;
    }
    const fallback = fallbackHref?.trim() || null;
    let timer: number | null = null;
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    document.addEventListener("visibilitychange", handleVisibility, { once: true });
    if (fallback) {
      timer = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.open(fallback, "_blank", "noopener,noreferrer");
        }
      }, 900);
    }
    window.location.assign(trimmed);
  };

  const onPinToContext = () => {
    if (!eventId) {
      return;
    }
    setPinBusy(true);
    void (async () => {
      try {
        const pinnedEvent = pinEaterySelectionToContext({
          eventId,
          row,
          previewUrl: row.images[0] ?? null,
        });
        if (bridgeShared) {
          await publishBridgePinnedContextItem(pinnedEvent);
        }
        toast.success(
          bridgeShared
            ? copy.globe.contextQuickPinSharedToast(row.name)
            : copy.globe.contextQuickPinToast(row.name),
        );
      } catch (caught) {
        toast.error(
          caught instanceof Error && caught.message.trim()
            ? caught.message.trim()
            : copy.globe.ingestAttachFail,
        );
      } finally {
        setPinBusy(false);
      }
    })();
  };

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
            {metaLine ? (
              <p className="mt-1 truncate text-[11px] text-white/62">{metaLine}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <GlobeContextQuickPinButton
              label={
                isPinned
                  ? bridgeShared
                    ? copy.globe.contextQuickPinSharedDone
                    : copy.globe.contextQuickPinDone
                  : bridgeShared
                    ? copy.globe.contextQuickPinSharedCta
                    : copy.globe.contextQuickPinCta
              }
              pinned={isPinned}
              busy={pinBusy}
              onClick={onPinToContext}
              className="bg-white/12"
            />
            <button
              type="button"
              onClick={() => setFocus(null)}
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80"
              aria-label={copy.globe.eateryFocusCloseAria}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
        {relationSummary ? (
          <div className="mt-2 rounded-[0.95rem] bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/78">
                {copy.globe.eateryRelationCardTitle(relationSummary.anchorName)}
              </span>
              <span className="rounded-full bg-[#ff9500]/16 px-2 py-0.5 text-[10px] font-semibold text-[#ffc266]">
                {relationSummary.badgeLabelKo}
              </span>
              {relationSummary.stayWindowLabelKo ? (
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-white/62">
                  {relationSummary.stayWindowLabelKo}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-white/88">
              {relationSummary.summaryKo}
            </p>
          </div>
        ) : null}
        <div className="mt-2">
          <GlobePredictedExperienceCard model={predictedExperience} tone="dark" />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-white/82">
          {reason?.reasonKo ?? copy.globe.eateryReasonFallback}
        </p>
        {row.address?.trim() ? (
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/58">
            {row.address.trim()}
          </p>
        ) : null}
        {reason?.matchReasons && reason.matchReasons.length > 1 ? (
          <ul className="mt-2 space-y-1">
            {reason.matchReasons.slice(1).map((line) => (
              <li key={line} className="text-[11px] text-white/65">
                · {line}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/45">
          {copy.globe.eateryFocusInfraHint}
        </p>
        <div className="mt-2 flex gap-2">
          {infraActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                if (eventId) {
                  offerEateryPreferenceLearn({ eventId, row });
                }
                openInfraHref(action.href, action.fallbackHref);
              }}
              className={cn(
                "flex-1 rounded-full px-4 py-2.5 text-[13px] font-semibold active:opacity-90",
                action.tone === "primary"
                  ? "bg-[#ff9500] text-white"
                  : "bg-white/10 text-white ring-1 ring-white/12",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.open(mapsHref, "_blank", "noopener,noreferrer")}
          className="mt-2 flex w-full items-center justify-center rounded-full bg-white/5 px-4 py-2 text-[12px] font-medium text-white/72 ring-1 ring-white/10 active:opacity-90"
        >
          {copy.globe.eateryFocusNavigate}
        </button>
        {eventId && row ? (
          <div className="mt-3 rounded-[0.95rem] bg-white/[0.04] p-2 ring-1 ring-white/8">
            <GlobeContextConditionPinBar
              contextEventId={eventId}
              anchorPlaceId={row.placeId}
              anchorPlaceName={row.name}
              anchorLat={row.lat}
              anchorLng={row.lng}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
