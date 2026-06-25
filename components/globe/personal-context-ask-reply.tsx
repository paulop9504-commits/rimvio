"use client";

import { Calendar, Camera, Cloud, MapPin, Users } from "lucide-react";
import { useMemo } from "react";
import type {
  PersonalContextBridgeHit,
  PersonalContextAskRecallContext,
  PersonalContextResponseFocus,
} from "@/lib/personal-context-ask";
import { pickAskPrimaryHit } from "@/lib/personal-context-ask/pick-ask-primary-hit";
import { PersonalContextAskPhotoThumb } from "@/components/globe/personal-context-ask-photo-thumb";
import { PersonalContextAskContinuity } from "@/components/globe/personal-context-ask-continuity";
import {
  requestGlobeAskBridgeFocus,
  type GlobeAskBridgeFocusMode,
} from "@/lib/globe/globe-ask-bridge-focus";
import type { GlobeAskContinuityActionId } from "@/lib/globe/globe-ask-continuity";
import { useAskRecallWeather } from "@/hooks/use-ask-recall-weather";
import { findLifeEventCandidate } from "@/lib/life-read-model";
import { cn } from "@/lib/utils";

function formatVisitDate(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "";
  }
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function shouldRestoreAssets(input: {
  hits: readonly PersonalContextBridgeHit[];
  totalPhotoCount: number;
  responseFocus: PersonalContextResponseFocus;
}): boolean {
  if (input.responseFocus === "photos") {
    return true;
  }
  return input.totalPhotoCount > 0 && input.hits.some((hit) => hit.photoCount > 0);
}

export type PersonalContextAskReplyProps = {
  narrative: string;
  hits: readonly PersonalContextBridgeHit[];
  featuredHitId?: string | null;
  totalPhotoCount?: number;
  responseFocus?: PersonalContextResponseFocus;
  relatedContextsLabel: string;
  viewPhotosLabel: string;
  viewMorePhotosLabel: string;
  viewMapLabel: string;
  openBridgeLabel: string;
  focusAria: (title: string) => string;
  photoCountLabel: (count: number) => string;
  visitDateLabel: string;
  recallContext?: PersonalContextAskRecallContext | null;
  continueExperienceLabel: string;
  continuityLabels: Record<GlobeAskContinuityActionId, string>;
  coExperienceHint: (count: number) => string;
  onFocus?: () => void;
  className?: string;
};

export function PersonalContextAskReply({
  narrative,
  hits,
  featuredHitId = null,
  totalPhotoCount = 0,
  responseFocus = "general",
  relatedContextsLabel,
  viewPhotosLabel,
  viewMorePhotosLabel,
  viewMapLabel,
  openBridgeLabel,
  focusAria,
  photoCountLabel,
  visitDateLabel,
  recallContext = null,
  continueExperienceLabel,
  continuityLabels,
  coExperienceHint,
  onFocus,
  className,
}: PersonalContextAskReplyProps) {
  const assetRestore = shouldRestoreAssets({ hits, totalPhotoCount, responseFocus });
  const primary =
    hits.find((hit) => hit.eventId === featuredHitId) ?? pickAskPrimaryHit(hits);
  const featuredEvent = useMemo(
    () => (primary ? findLifeEventCandidate(primary.eventId) : null),
    [primary],
  );
  const { weatherLine: fetchedWeatherLine } = useAskRecallWeather({
    event: featuredEvent,
    enabled: !recallContext?.weatherLine,
  });
  const displayWeather =
    recallContext?.weatherLine?.trim() || fetchedWeatherLine?.trim() || null;
  const relationshipAnchor = recallContext?.relationshipAnchor?.trim() || null;
  const coExperienceCount = recallContext?.coExperienceCount ?? 0;
  const secondaryHits =
    primary && hits.length > 1
      ? hits.filter((hit) => hit.eventId !== primary.eventId)
      : [];

  const focusBridge = (eventId: string, mode: GlobeAskBridgeFocusMode) => {
    requestGlobeAskBridgeFocus(eventId, mode);
    onFocus?.();
  };

  if (!primary) {
    return null;
  }

  const title = primary.headline || primary.title;
  const place = primary.place ?? primary.title;
  const participants = primary.people.join(", ");
  const visitDate = formatVisitDate(primary.atIso);
  const previews = primary.photoPreviews;
  const photoCount = primary.photoCount;
  const hasPhotos = previews.length > 0;
  const hasMorePhotos = photoCount > previews.length;

  const primaryButtonClass =
    "rounded-full bg-[#191f28] px-3.5 py-1.5 text-[12px] font-semibold text-white active:scale-[0.98]";
  const secondaryButtonClass =
    "rounded-full bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#191f28] ring-1 ring-black/[0.06] active:scale-[0.98]";
  const tertiaryButtonClass =
    "rounded-full px-3 py-1.5 text-[12px] font-medium text-[#6b7684] underline-offset-2 hover:underline active:opacity-70";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {narrative.split("\n\n").map((paragraph, index) => (
          <p
            key={`${index}-${paragraph.slice(0, 12)}`}
            className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#191f28]"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {assetRestore ? (
        <div className="space-y-3">
          <ul className="space-y-1.5 text-[13px] text-[#4e5968]">
            {place ? (
              <li className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span className="font-medium text-[#191f28]">{place}</span>
              </li>
            ) : null}
            {visitDate ? (
              <li className="flex items-center gap-2">
                <Calendar className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span>
                  {visitDateLabel} {visitDate}
                </span>
              </li>
            ) : null}
            {participants ? (
              <li className="flex items-center gap-2">
                <Users className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span>{participants}</span>
              </li>
            ) : null}
            {displayWeather ? (
              <li className="flex items-center gap-2">
                <Cloud className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span>{displayWeather}</span>
              </li>
            ) : null}
            {coExperienceCount > 1 ? (
              <li className="text-[12px] text-[#8b95a1]">
                {coExperienceHint(coExperienceCount)}
              </li>
            ) : null}
            {relationshipAnchor ? (
              <li className="text-[12px] text-[#8b95a1]">{relationshipAnchor}</li>
            ) : null}
            {photoCount > 0 ? (
              <li className="flex items-center gap-2">
                <Camera className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span>{photoCountLabel(photoCount)}</span>
              </li>
            ) : null}
          </ul>

          {hasPhotos ? (
            <div className="grid grid-cols-3 gap-1.5">
              {previews.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-xl active:opacity-85"
                  aria-label={focusAria(title)}
                  onClick={() => focusBridge(primary.eventId, "photos")}
                >
                  <PersonalContextAskPhotoThumb photo={photo} className="size-full" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {hasPhotos ? (
              <button
                type="button"
                className={primaryButtonClass}
                aria-label={focusAria(title)}
                onClick={() => focusBridge(primary.eventId, "photos")}
              >
                {viewPhotosLabel}
              </button>
            ) : null}
            {hasMorePhotos ? (
              <button
                type="button"
                className={hasPhotos ? secondaryButtonClass : primaryButtonClass}
                aria-label={focusAria(title)}
                onClick={() => focusBridge(primary.eventId, "photos")}
              >
                {viewMorePhotosLabel}
              </button>
            ) : null}
            <button
              type="button"
              className={secondaryButtonClass}
              aria-label={focusAria(title)}
              onClick={() => focusBridge(primary.eventId, "map")}
            >
              {viewMapLabel}
            </button>
            <button
              type="button"
              className={tertiaryButtonClass}
              aria-label={focusAria(title)}
              onClick={() => focusBridge(primary.eventId, "bridge")}
            >
              {openBridgeLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl bg-[#f8f9fb] p-3.5 ring-1 ring-black/[0.04]">
          <ul className="space-y-1.5 text-[13px] text-[#4e5968]">
            {place ? (
              <li className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span className="font-medium text-[#191f28]">{place}</span>
              </li>
            ) : null}
            {visitDate ? (
              <li className="flex items-center gap-2">
                <Calendar className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span>
                  {visitDateLabel} {visitDate}
                </span>
              </li>
            ) : null}
            {participants ? (
              <li className="flex items-center gap-2">
                <Users className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span>{participants}</span>
              </li>
            ) : null}
            {displayWeather ? (
              <li className="flex items-center gap-2">
                <Cloud className="size-3.5 shrink-0 text-[#8b95a1]" aria-hidden />
                <span>{displayWeather}</span>
              </li>
            ) : null}
            {coExperienceCount > 1 ? (
              <li className="text-[12px] text-[#8b95a1]">
                {coExperienceHint(coExperienceCount)}
              </li>
            ) : null}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButtonClass}
              aria-label={focusAria(title)}
              onClick={() => focusBridge(primary.eventId, "map")}
            >
              {viewMapLabel}
            </button>
            <button
              type="button"
              className={tertiaryButtonClass}
              aria-label={focusAria(title)}
              onClick={() => focusBridge(primary.eventId, "bridge")}
            >
              {openBridgeLabel}
            </button>
          </div>
        </div>
      )}

      {secondaryHits.length > 0 ? (
        <div className="space-y-2 border-t border-black/[0.05] pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8b95a1]">
            {relatedContextsLabel}
          </p>
          <ul className="space-y-2">
            {secondaryHits.map((hit) => {
              const label = hit.headline || hit.title;
              return (
                <li key={hit.eventId}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-xl bg-[#f8f9fb] px-3 py-2.5 text-left text-[13px] text-[#4e5968] ring-1 ring-black/[0.04] active:opacity-80"
                    onClick={() => focusBridge(hit.eventId, "photos")}
                  >
                    <span className="truncate font-medium text-[#191f28]">{label}</span>
                    {hit.photoCount > 0 ? (
                      <span className="shrink-0 text-[#8b95a1]">
                        {photoCountLabel(hit.photoCount)}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <PersonalContextAskContinuity
        recall={recallContext}
        featuredEventId={primary.eventId}
        continueLabel={continueExperienceLabel}
        labels={continuityLabels}
        onNavigate={onFocus}
      />
    </div>
  );
}
