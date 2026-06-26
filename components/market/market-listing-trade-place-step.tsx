"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { copy } from "@/lib/copy/human-ko";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { enrichMarketMemoryFromPhotoPlace } from "@/lib/globe/market/enrich-market-memory-from-photo-place";
import { extractMarketPhotoMemoryPlace } from "@/lib/globe/market/extract-market-photo-memory-place";
import {
  resolveMarketListingTradePlace,
  type MarketListingTradePlaceResolution,
} from "@/lib/globe/market/resolve-market-listing-trade-place";
import {
  hasValidMarketTradeDistrict,
  listMetroCities,
  listMetroDistrictsForCity,
  matchKoreaMetroDistrict,
  type KoreaMetroDistrict,
} from "@/lib/globe/korea-metro-districts";
import { marketMeetPreferenceLabelKo } from "@/lib/globe/market/market-intent-detail";
import type { MarketMeetPreferenceId } from "@/lib/globe/market/market-intent-detail";
import {
  MARKET_AVAILABILITY_PRESET_ORDER,
  type MarketAvailabilityPreset,
  marketAvailabilityPresetLabelKo,
} from "@/lib/globe/market/market-availability-preset";
import { sampleEphemeralGpsPlace } from "@/lib/globe/sample-ephemeral-gps-place";
import { resolveKoreaPlaceFromCoords } from "@/lib/globe/korea-place-from-coords";
import { rimvioGhostCtaClass, rimvioHeroCtaClass, RIMVIO_TYPE } from "@/lib/design/rimvio-ontology";
import { cn } from "@/lib/utils";

const RADIUS_OPTIONS = [3, 5, 10] as const;
const MEET_OPTIONS: MarketMeetPreferenceId[] = ["nearby", "flexible", "pickup_only"];
const AVAILABILITY_OPTIONS = MARKET_AVAILABILITY_PRESET_ORDER;

type UiMode = "mismatch" | "district" | "options";

function marketAvailabilityPresetLabel(preset: MarketAvailabilityPreset): string {
  switch (preset) {
    case "weekend_evening":
      return copy.globe.marketWizardAvailabilityWeekendEvening;
    case "weekend_day":
      return copy.globe.marketWizardAvailabilityWeekendDay;
    case "weekday_afternoon":
      return copy.globe.marketWizardAvailabilityWeekdayAfternoon;
    case "weekday_day":
      return copy.globe.marketWizardAvailabilityWeekdayDay;
    case "anytime":
      return copy.globe.marketWizardAvailabilityAnytime;
    default:
      return marketAvailabilityPresetLabelKo(preset);
  }
}

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

function placeStepTitle(role: MarketIntentRole): string {
  return role === "seeking"
    ? copy.globe.marketWizardPlaceTitleSeeking
    : copy.globe.marketWizardPlaceTitleListing;
}

export type MarketTradePlaceStepProps = {
  draft: MarketIntentDraft;
  role: MarketIntentRole;
  photoFiles?: readonly File[];
  onChange: (draft: MarketIntentDraft) => void;
  onResolvingChange?: (resolving: boolean) => void;
};

export type MarketListingTradePlaceStepProps = Omit<MarketTradePlaceStepProps, "role"> & {
  role?: MarketIntentRole;
};

export function MarketTradePlaceStep({
  draft,
  role,
  photoFiles = [],
  onChange,
  onResolvingChange,
}: MarketTradePlaceStepProps) {
  const [resolving, setResolving] = useState(true);
  const [resolution, setResolution] = useState<MarketListingTradePlaceResolution | null>(
    null,
  );
  const [uiMode, setUiMode] = useState<UiMode>("district");
  const [metroCity, setMetroCity] = useState<string>("서울");
  const [suggestedDistrictLabel, setSuggestedDistrictLabel] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  const draftRef = useRef(draft);
  onChangeRef.current = onChange;
  draftRef.current = draft;

  const isListing = role === "listing";
  const productLabel =
    draft.detail.productName.trim() || draft.title.trim() || copy.globe.marketTradePlaceProductFallback;
  const metroCities = useMemo(() => listMetroCities(), []);
  const districts = useMemo(() => listMetroDistrictsForCity(metroCity), [metroCity]);
  const matchedDistrict = useMemo(
    () => matchKoreaMetroDistrict(draft.placeLabel),
    [draft.placeLabel],
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
    setUiMode("district");
    setSuggestedDistrictLabel(null);
    onChangeRef.current({
      ...draftRef.current,
      placeLabel: "",
      anchorLat: 0,
      anchorLng: 0,
    });

    void (async () => {
      const gps = await sampleEphemeralGpsPlace();
      if (cancelled) {
        return;
      }

      let nextDraft = draftRef.current;
      let nextResolution: MarketListingTradePlaceResolution | null = null;
      let nextCity = "서울";
      let nextSuggested: string | null = null;
      let nextMode: UiMode = "district";

      if (gps) {
        if (isListing) {
          const photoMemory = await extractMarketPhotoMemoryPlace(photoFiles);
          if (cancelled) {
            return;
          }
          nextDraft = enrichMarketMemoryFromPhotoPlace(draftRef.current, photoMemory);
          nextResolution = resolveMarketListingTradePlace({
            gpsLat: gps.lat,
            gpsLng: gps.lng,
            photoMemory,
          });
          setResolution(nextResolution);

          if (nextResolution.kind === "mismatch") {
            nextCity = nextResolution.metroCity;
            nextMode = "mismatch";
          } else {
            nextCity = nextResolution.trade.metroCity ?? "서울";
            const metroMatch = matchKoreaMetroDistrict(nextResolution.trade.placeLabel);
            nextSuggested = metroMatch?.label ?? null;
          }
        } else {
          const gpsResolved = resolveKoreaPlaceFromCoords(gps.lat, gps.lng);
          const metroMatch = matchKoreaMetroDistrict(gpsResolved.label);
          nextCity = gpsResolved.metroCity ?? metroMatch?.city ?? "서울";
          nextSuggested = metroMatch?.label ?? null;
        }
      }

      setMetroCity(nextCity);
      setSuggestedDistrictLabel(nextSuggested);
      setUiMode(nextMode);
      onChangeRef.current(nextDraft);
      setResolvingSafe(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [draft.eventId, isListing, photoFiles, setResolvingSafe]);

  const pickDistrict = (row: KoreaMetroDistrict) => {
    onChange(
      applyTradePlace(draft, {
        placeLabel: row.label,
        lat: row.lat,
        lng: row.lng,
      }),
    );
    setUiMode("options");
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
              const metroMatch = matchKoreaMetroDistrict(resolution.gps.placeLabel);
              setMetroCity(metroMatch?.city ?? resolution.metroCity);
              setSuggestedDistrictLabel(metroMatch?.label ?? null);
              setUiMode("district");
            }}
          >
            {copy.globe.marketTradePlaceTradeHere(resolution.gps.placeLabel)}
          </button>
          <button
            type="button"
            className={cn(rimvioGhostCtaClass(), "w-full")}
            onClick={() => {
              setMetroCity(resolution.metroCity);
              setSuggestedDistrictLabel(null);
              setUiMode("district");
            }}
          >
            {copy.globe.marketTradePlaceOtherDistrict}
          </button>
        </div>
      </div>
    );
  }

  if (uiMode === "district") {
    return (
      <div className="space-y-4">
        <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>{placeStepTitle(role)}</p>
        <div className="space-y-2">
          <p className={cn(RIMVIO_TYPE.caption)}>{copy.globe.marketTradePlaceCityLabel}</p>
          <div className="flex flex-wrap gap-2">
            {metroCities.map((city) => (
              <Chip
                key={city}
                active={metroCity === city}
                onClick={() => {
                  setMetroCity(city);
                  setSuggestedDistrictLabel(null);
                }}
              >
                {city}
              </Chip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className={cn(RIMVIO_TYPE.caption)}>
            {copy.globe.marketTradePlaceDistrictTitle(metroCity)}
          </p>
          {suggestedDistrictLabel ? (
            <p className={cn(RIMVIO_TYPE.caption, "text-[12px] text-primary")}>
              {suggestedDistrictLabel}
            </p>
          ) : null}
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>{placeStepTitle(role)}</p>
      <div className="rounded-2xl bg-muted/40 px-3 py-3">
        <p className={cn(RIMVIO_TYPE.caption, "mb-1")}>{copy.globe.marketTradePlaceCurrentLabel}</p>
        <p className="flex items-center gap-1.5 text-[15px] font-semibold">
          <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
          {matchedDistrict?.label ?? draft.placeLabel}
        </p>
        <button
          type="button"
          className="mt-2 text-[13px] font-medium text-primary"
          onClick={() => {
            if (matchedDistrict) {
              setMetroCity(matchedDistrict.city);
            }
            setUiMode("district");
          }}
        >
          {copy.globe.marketTradePlaceChangeDistrict}
        </button>
      </div>

      {isListing && draft.detail.memoryPlaceLabel ? (
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

      {isListing ? (
        <div className="space-y-2">
          <p className={cn(RIMVIO_TYPE.caption)}>{copy.globe.marketWizardAvailabilityTitle}</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((preset) => (
              <Chip
                key={preset}
                active={draft.detail.availabilityPreset === preset}
                onClick={() =>
                  onChange({
                    ...draft,
                    detail: { ...draft.detail, availabilityPreset: preset },
                  })
                }
              >
                {marketAvailabilityPresetLabel(preset)}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use MarketTradePlaceStep */
export function MarketListingTradePlaceStep({
  role = "listing",
  ...props
}: MarketListingTradePlaceStepProps) {
  return <MarketTradePlaceStep {...props} role={role} />;
}

export function marketTradePlaceStepIsComplete(placeLabel: string): boolean {
  return hasValidMarketTradeDistrict(placeLabel);
}
