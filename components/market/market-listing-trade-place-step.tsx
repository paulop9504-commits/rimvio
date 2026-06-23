"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, MapPin } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { enrichMarketMemoryFromPhotoPlace } from "@/lib/globe/market/enrich-market-memory-from-photo-place";
import { extractMarketPhotoMemoryPlace } from "@/lib/globe/market/extract-market-photo-memory-place";
import {
  resolveMarketListingTradePlace,
  type MarketListingTradePlaceResolution,
} from "@/lib/globe/market/resolve-market-listing-trade-place";
import {
  listMetroDistrictsForCity,
  type KoreaMetroDistrict,
} from "@/lib/globe/korea-metro-districts";
import { marketMeetPreferenceLabelKo } from "@/lib/globe/market/market-intent-detail";
import type { MarketMeetPreferenceId } from "@/lib/globe/market/market-intent-detail";
import { sampleEphemeralGpsPlace } from "@/lib/globe/sample-ephemeral-gps-place";
import { rimvioGhostCtaClass, rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

const RADIUS_OPTIONS = [3, 5, 10] as const;
const MEET_OPTIONS: MarketMeetPreferenceId[] = ["nearby", "flexible", "pickup_only"];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/80 text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function applyTradePlace(
  draft: MarketIntentDraft,
  place: { placeLabel: string; lat: number; lng: number },
): MarketIntentDraft {
  return {
    ...draft,
    placeLabel: place.placeLabel,
    anchorLat: place.lat,
    anchorLng: place.lng,
    detail: {
      ...draft.detail,
      prioritySlots: {
        ...draft.detail.prioritySlots,
        distance: `${draft.radiusKm}km`,
      },
    },
  };
}

export type MarketListingTradePlaceStepProps = {
  draft: MarketIntentDraft;
  photoFiles: readonly File[];
  onChange: (draft: MarketIntentDraft) => void;
  onResolvingChange?: (resolving: boolean) => void;
};

export function MarketListingTradePlaceStep({
  draft,
  photoFiles,
  onChange,
  onResolvingChange,
}: MarketListingTradePlaceStepProps) {
  const [resolving, setResolving] = useState(true);
  const [resolution, setResolution] = useState<MarketListingTradePlaceResolution | null>(
    null,
  );
  const [uiMode, setUiMode] = useState<"auto" | "mismatch" | "district">("auto");
  const [metroCity, setMetroCity] = useState<string>("서울");
  const onChangeRef = useRef(onChange);
  const draftRef = useRef(draft);
  onChangeRef.current = onChange;
  draftRef.current = draft;

  const productLabel =
    draft.detail.productName.trim() || draft.title.trim() || copy.globe.marketTradePlaceProductFallback;

  const districts = useMemo(
    () => listMetroDistrictsForCity(metroCity),
    [metroCity],
  );

  const setResolvingSafe = useCallback(
    (value: boolean) => {
      setResolving(value);
      onResolvingChange?.(value);
    },
    [onResolvingChange],
  );

  useEffect(() => {
    let cancelled = false;
    setResolvingSafe(true);
    void (async () => {
      const gps = await sampleEphemeralGpsPlace();
      if (cancelled) {
        return;
      }
      if (!gps) {
        setResolution(null);
        setUiMode("auto");
        setResolvingSafe(false);
        return;
      }

      const photoMemory = await extractMarketPhotoMemoryPlace(photoFiles);
      if (cancelled) {
        return;
      }

      let nextDraft = enrichMarketMemoryFromPhotoPlace(draftRef.current, photoMemory);
      const resolved = resolveMarketListingTradePlace({
        gpsLat: gps.lat,
        gpsLng: gps.lng,
        photoMemory,
      });
      setResolution(resolved);

      if (resolved.kind === "auto") {
        nextDraft = applyTradePlace(nextDraft, resolved.trade);
        setUiMode("auto");
        setMetroCity(resolved.trade.metroCity ?? "서울");
      } else {
        setUiMode("mismatch");
        setMetroCity(resolved.metroCity);
      }

      onChangeRef.current(nextDraft);
      setResolvingSafe(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.eventId, photoFiles, setResolvingSafe]);

  const pickDistrict = (row: KoreaMetroDistrict) => {
    onChange(
      applyTradePlace(draft, {
        placeLabel: row.label,
        lat: row.lat,
        lng: row.lng,
      }),
    );
    setUiMode("auto");
  };

  if (resolving) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
        <p className={cn(RIMVIO_TYPE.caption)}>{copy.globe.marketTradePlaceResolving}</p>
      </div>
    );
  }

  if (uiMode === "mismatch" && resolution?.kind === "mismatch") {
    return (
      <div className="space-y-4">
        <p className={cn(RIMVIO_TYPE.headline, "text-lg leading-snug")}>
          {copy.globe.marketTradePlaceMismatchHeadline(
            resolution.gps.placeLabel.split(/\s+/u)[0] ?? resolution.gps.placeLabel,
            productLabel,
          )}
        </p>
        <p className={cn(RIMVIO_TYPE.caption)}>
          {copy.globe.marketTradePlaceMismatchBody(resolution.photoMemory.placeLabel)}
        </p>
        <div className="space-y-2">
          <button
            type="button"
            className={cn(rimvioHeroCtaClass(), "w-full")}
            onClick={() => {
              onChange(applyTradePlace(draft, resolution.gps));
              setUiMode("auto");
            }}
          >
            {copy.globe.marketTradePlaceTradeHere(resolution.gps.placeLabel)}
          </button>
          <button
            type="button"
            className={cn(rimvioGhostCtaClass(), "w-full")}
            onClick={() => setUiMode("district")}
          >
            {copy.globe.marketTradePlaceOtherDistrict}
          </button>
        </div>
      </div>
    );
  }

  if (uiMode === "district") {
    return (
      <div className="space-y-3">
        <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
          {copy.globe.marketTradePlaceDistrictTitle(metroCity)}
        </p>
        <div className="flex flex-wrap gap-2">
          {districts.map((row) => (
            <Chip
              key={row.label}
              active={draft.placeLabel === row.label}
              onClick={() => pickDistrict(row)}
            >
              {row.district}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          className={cn(rimvioGhostCtaClass(), "w-full text-[13px]")}
          onClick={() => setUiMode(resolution?.kind === "mismatch" ? "mismatch" : "auto")}
        >
          {copy.globe.marketWizardBack}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>{copy.globe.marketWizardPlaceTitle}</p>
      <div className="rounded-2xl bg-muted/40 px-3 py-3">
        <p className={cn(RIMVIO_TYPE.caption, "mb-1")}>{copy.globe.marketTradePlaceCurrentLabel}</p>
        <p className="flex items-center gap-1.5 text-[15px] font-semibold">
          <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
          {draft.placeLabel || copy.globe.marketIntentPrefillHint}
        </p>
        <button
          type="button"
          className="mt-2 text-[13px] font-medium text-primary"
          onClick={() => {
            setMetroCity(
              resolution?.kind === "auto"
                ? resolution.trade.metroCity ?? metroCity
                : metroCity,
            );
            setUiMode("district");
          }}
        >
          {copy.globe.marketTradePlaceChangeDistrict}
        </button>
      </div>

      {draft.detail.memoryPlaceLabel ? (
        <p className={cn(RIMVIO_TYPE.caption, "rounded-xl bg-primary/5 px-3 py-2 text-[13px]")}>
          {copy.globe.marketTradePlaceMemoryLinked(draft.detail.memoryPlaceLabel)}
        </p>
      ) : null}

      <div className="flex gap-2">
        {RADIUS_OPTIONS.map((km) => (
          <Chip
            key={km}
            active={draft.radiusKm === km}
            onClick={() => onChange({ ...draft, radiusKm: km })}
          >
            {km}km
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {MEET_OPTIONS.map((id) => (
          <Chip
            key={id}
            active={draft.detail.meetPreference === id}
            onClick={() =>
              onChange({
                ...draft,
                detail: { ...draft.detail, meetPreference: id },
              })
            }
          >
            {marketMeetPreferenceLabelKo(id)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
