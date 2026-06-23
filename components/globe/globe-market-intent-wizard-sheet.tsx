"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { MarketListingTradePlaceStep } from "@/components/market/market-listing-trade-place-step";
import { MarketPrioritySlotFields } from "@/components/market/market-priority-slot-fields";
import { MarketMemoryRecordFields } from "@/components/market/market-memory-record-fields";
import {
  MARKET_CATEGORY_OPTIONS,
  marketCategoryLabelKo,
} from "@/lib/globe/market/market-category-registry";
import { commitMarketIntentFromDraft } from "@/lib/globe/market/commit-market-intent";
import { marketMeetPreferenceLabelKo, type MarketMeetPreferenceId } from "@/lib/globe/market/market-intent-detail";
import {
  marketWizardProgress,
  marketWizardSteps,
  type MarketWizardStepId,
} from "@/lib/globe/market/market-intent-wizard-flow";
import type { MarketIntentDraft, MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { syncMarketMemoryRecordOnDraft } from "@/lib/globe/market/memory/sync-market-memory-record";
import { formatMarketMemoryPreview } from "@/lib/globe/market/memory/format-market-memory-preview";
import { isValidMarketProductName } from "@/lib/globe/market/sanitize-market-product-name";
import { getTopPrioritySlots } from "@/lib/globe/market/market-priority-matrix";
import { copy } from "@/lib/copy/human-ko";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioCompactPrimaryCtaClass,
  rimvioGhostCtaClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
} from "@/lib/design/rimvio-ontology";
import {
  MARKET_TRADE_LIST_PILL,
  MARKET_TRADE_SEEK_PILL,
} from "@/lib/design/market-trade-pills";
import { cn } from "@/lib/utils";

export type GlobeMarketIntentWizardSheetProps = {
  draft: MarketIntentDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: (input: {
    eventId: string;
    role: MarketIntentRole;
    lat: number;
    lng: number;
    placeLabel: string;
  }) => void;
  /** Skip role step when opened from globe trade dock. */
  startStep?: MarketWizardStepId;
  /** Portal launch — intent already chosen; never show role step. */
  portalLaunch?: boolean;
};

const MEET_OPTIONS: readonly MarketMeetPreferenceId[] = ["nearby", "flexible", "pickup_only"];
const RADIUS_OPTIONS = [3, 5, 10] as const;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function stepLabel(step: MarketWizardStepId): string {
  switch (step) {
    case "role":
      return copy.globe.marketWizardStepRole;
    case "recognize":
      return copy.globe.marketWizardStepRecognize;
    case "priority":
      return copy.globe.marketPriorityCardEyebrow;
    case "photos":
      return copy.globe.marketWizardStepPhotos;
    case "memory":
      return copy.globe.marketWizardStepMemory;
    case "place":
      return copy.globe.marketWizardStepPlace;
    case "review":
      return copy.globe.marketWizardStepReview;
    default:
      return step;
  }
}

function formatPriceRange(draft: MarketIntentDraft): string {
  const { priceMinKrw, priceMaxKrw } = draft;
  if (priceMinKrw === null && priceMaxKrw === null) {
    return copy.globe.marketIntentPriceOpen;
  }
  if (priceMinKrw !== null && priceMaxKrw !== null) {
    if (priceMinKrw === priceMaxKrw) {
      return `${Math.round(priceMinKrw / 10_000)}만원`;
    }
    return `${Math.round(priceMinKrw / 10_000)}~${Math.round(priceMaxKrw / 10_000)}만원`;
  }
  if (priceMaxKrw !== null) {
    return `${Math.round(priceMaxKrw / 10_000)}만원 이하`;
  }
  return `${Math.round((priceMinKrw ?? 0) / 10_000)}만원 이상`;
}

export function GlobeMarketIntentWizardSheet({
  draft,
  open,
  onOpenChange,
  onConfirmed,
  startStep,
  portalLaunch = false,
}: GlobeMarketIntentWizardSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<MarketWizardStepId>("role");
  const [working, setWorking] = useState<MarketIntentDraft | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  const steps = useMemo(
    () =>
      working
        ? marketWizardSteps(working.role, { skipRole: portalLaunch })
        : [],
    [portalLaunch, working],
  );
  const progress = working
    ? marketWizardProgress(working.role, step, { skipRole: portalLaunch })
    : { current: 1, total: 1 };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !draft) {
      return;
    }
    setWorking({ ...draft, detail: { ...draft.detail, prioritySlots: { ...draft.detail.prioritySlots } } });
    const skipRole =
      portalLaunch ||
      (startStep &&
        startStep !== "role" &&
        draft.prefillSources.includes("trade_dock"));
    setStep(skipRole ? startStep ?? "recognize" : "role");
    setPhotoFiles([]);
    setPhotoPreviews([]);
  }, [draft, open, portalLaunch, startStep]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      for (const url of photoPreviews) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoPreviews]);

  const goNext = useCallback(() => {
    if (!working) {
      return;
    }
    const index = steps.indexOf(step);
    if (index < 0 || index >= steps.length - 1) {
      return;
    }
    setStep(steps[index + 1]!);
  }, [step, steps, working]);

  const goBack = useCallback(() => {
    if (!working) {
      return;
    }
    const index = steps.indexOf(step);
    if (index <= 0) {
      return;
    }
    setStep(steps[index - 1]!);
  }, [step, steps, working]);

  const selectRole = useCallback(
    (role: MarketIntentRole) => {
      if (!working) {
        return;
      }
      setWorking({ ...working, role });
      setStep("recognize");
    },
    [working],
  );

  const validateStep = useCallback((): boolean => {
    if (!working) {
      return false;
    }
    if (step === "role") {
      return false;
    }
    if (step === "priority") {
      const name = working.detail.productName.trim();
      if (!isValidMarketProductName(name)) {
        toast.message(copy.globe.marketWizardValidationProductDetail);
        return false;
      }
      const top = getTopPrioritySlots(working.categoryId);
      const hasPrice = working.priceMinKrw !== null || working.priceMaxKrw !== null;
      const priceRequired = top.some((slot) => slot.field === "price");
      if (priceRequired && !hasPrice && !working.detail.priceNegotiable) {
        toast.message(copy.globe.marketWizardValidationPrice);
        return false;
      }
      return true;
    }
    if (step === "place" && !working.placeLabel.trim()) {
      toast.message(copy.globe.marketTradePlaceResolving);
      return false;
    }
    return true;
  }, [step, working]);

  const onPhotosSelected = useCallback((fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }
    const next = [...photoFiles, ...Array.from(fileList)].slice(0, 3);
    setPhotoFiles(next);
    setPhotoPreviews((prev) => {
      for (const url of prev) {
        URL.revokeObjectURL(url);
      }
      return next.map((file) => URL.createObjectURL(file));
    });
    if (photoRef.current) {
      photoRef.current.value = "";
    }
  }, [photoFiles]);

  const handleConfirm = useCallback(
    async (publishExternal: boolean) => {
    if (!working || busy) {
      return;
    }
    setBusy(true);
    try {
      const name = working.detail.productName.trim() || working.title.trim();
      const finalDraft = syncMarketMemoryRecordOnDraft(
        {
          ...working,
          title: name,
          detail: {
            ...working.detail,
            productName: name,
            photoCount: photoFiles.length,
            prioritySlots: {
              ...working.detail.prioritySlots,
              distance: `${working.radiusKm}km`,
            },
          },
        },
        {},
      );
      if (working.role !== "listing") {
        toast.message(copy.globe.marketPinGpsPrompt, { duration: 2400 });
      }
      const saved = await commitMarketIntentFromDraft(finalDraft, {
        photoFiles: photoFiles.length > 0 ? photoFiles : undefined,
        publishExternal,
      });
      if (publishExternal) {
        toast.success(copy.globe.marketWizardPublishedToast);
      } else {
        toast.success(copy.globe.marketWizardSavedInternalToast);
      }
      onConfirmed?.({
        eventId: saved.eventId,
        role: saved.role,
        lat: saved.anchorLat,
        lng: saved.anchorLng,
        placeLabel: saved.placeLabel,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  },
    [busy, onConfirmed, onOpenChange, photoFiles, working],
  );

  if (!mounted) {
    return null;
  }

  const isSeeking = working?.role === "seeking";
  const eyebrow = isSeeking
    ? copy.globe.marketWizardEyebrowSeeking
    : copy.globe.marketWizardEyebrowListing;

  return createPortal(
    <AnimatePresence>
      {open && working ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            className={cn(rimvioSheetBackdropClass(), "z-[10080]")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cn(
              rimvioBottomSheetClass(),
              "z-[10081] flex max-h-[min(92dvh,720px)] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            data-market-intent-wizard
          >
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <div>
                <p className={cn(RIMVIO_TYPE.eyebrow, "text-primary")}>{eyebrow}</p>
                <p className={cn(RIMVIO_TYPE.caption, "mt-0.5")}>
                  {copy.globe.marketWizardProgress(progress.current, progress.total)}
                  {" · "}
                  {stepLabel(step)}
                </p>
              </div>
              <button
                type="button"
                className={rimvioSheetCloseBtnClass()}
                onClick={() => onOpenChange(false)}
                aria-label="닫기"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {step === "role" && !portalLaunch ? (
                <div className="space-y-4">
                  <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
                    {copy.globe.marketWizardRoleTitle}
                  </p>
                  <p className={cn(RIMVIO_TYPE.caption)}>{copy.globe.marketWizardRoleBody}</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      className={MARKET_TRADE_LIST_PILL}
                      onClick={() => selectRole("listing")}
                      data-market-role-card="listing"
                    >
                      <span className="block leading-tight">
                        {copy.globe.marketWizardRoleListingTitle}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium opacity-90">
                        {copy.globe.marketWizardRoleListingBody}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={MARKET_TRADE_SEEK_PILL}
                      onClick={() => selectRole("seeking")}
                      data-market-role-card="seeking"
                    >
                      <span className="block leading-tight">
                        {copy.globe.marketWizardRoleSeekingTitle}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium opacity-90">
                        {copy.globe.marketWizardRoleSeekingBody}
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}

              {step === "recognize" ? (
                <div>
                  <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
                    {isSeeking
                      ? copy.globe.marketWizardRecognizeTitleSeeking
                      : copy.globe.marketWizardRecognizeTitleListing}
                  </p>
                  <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
                    {copy.globe.marketWizardRecognizeBody}
                  </p>
                  <div className="mt-4 rounded-2xl bg-muted/40 p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <p className="text-[14px] leading-relaxed text-foreground">
                        {working.detail.sourceText ||
                          working.title ||
                          (isSeeking
                            ? copy.globe.marketWizardRoleSeekingBody
                            : copy.globe.marketWizardRoleListingBody)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {MARKET_CATEGORY_OPTIONS.map((id) => (
                      <Chip
                        key={id}
                        active={working.categoryId === id}
                        onClick={() => setWorking({ ...working, categoryId: id })}
                      >
                        {marketCategoryLabelKo(id)}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === "priority" ? (
                <MarketPrioritySlotFields draft={working} onChange={setWorking} />
              ) : null}

              {step === "photos" && !isSeeking ? (
                <div className="space-y-3">
                  <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
                    {copy.globe.marketWizardPhotosTitle}
                  </p>
                  <p className={cn(RIMVIO_TYPE.caption)}>{copy.globe.marketWizardPhotosBody}</p>
                  <div className="flex flex-wrap gap-2">
                    {photoPreviews.map((url, index) => (
                      <div key={url} className="relative size-20 overflow-hidden rounded-xl bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="size-full object-cover" />
                      </div>
                    ))}
                    {photoPreviews.length < 3 ? (
                      <button
                        type="button"
                        className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 text-[11px] text-muted-foreground"
                        onClick={() => photoRef.current?.click()}
                      >
                        <Camera className="size-5" aria-hidden />
                        {copy.globe.marketWizardPhotosAdd}
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={(event) => onPhotosSelected(event.target.files)}
                  />
                </div>
              ) : null}

              {step === "memory" ? (
                <MarketMemoryRecordFields draft={working} onChange={setWorking} />
              ) : null}

              {step === "place" && !isSeeking ? (
                <MarketListingTradePlaceStep
                  draft={working}
                  photoFiles={photoFiles}
                  onChange={setWorking}
                  onResolvingChange={setBusy}
                />
              ) : null}

              {step === "place" && isSeeking ? (
                <div className="space-y-3">
                  <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
                    {copy.globe.marketWizardPlaceTitle}
                  </p>
                  {working.placeLabel ? (
                    <p className="flex items-center gap-1.5 text-[14px] font-medium">
                      <MapPin className="size-4 text-primary" aria-hidden />
                      {working.placeLabel}
                    </p>
                  ) : (
                    <p className={cn(RIMVIO_TYPE.caption)}>{copy.globe.marketIntentPrefillHint}</p>
                  )}
                  <div className="flex gap-2">
                    {RADIUS_OPTIONS.map((km) => (
                      <Chip
                        key={km}
                        active={working.radiusKm === km}
                        onClick={() => setWorking({ ...working, radiusKm: km })}
                      >
                        {km}km
                      </Chip>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MEET_OPTIONS.map((id) => (
                      <Chip
                        key={id}
                        active={working.detail.meetPreference === id}
                        onClick={() =>
                          setWorking({
                            ...working,
                            detail: { ...working.detail, meetPreference: id },
                          })
                        }
                      >
                        {marketMeetPreferenceLabelKo(id)}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === "review" ? (
                <div>
                  <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
                    {copy.globe.marketWizardReviewTitle}
                  </p>
                  <p className={cn("mt-1", RIMVIO_TYPE.caption)}>
                    {copy.globe.marketWizardReviewPublishHint}
                  </p>
                  <dl className="mt-4 space-y-2 rounded-2xl bg-muted/40 p-3 text-[13px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{copy.globe.marketWizardProductNameLabel}</dt>
                      <dd className="font-semibold text-right">{working.detail.productName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{copy.globe.marketIntentFieldCategory}</dt>
                      <dd className="font-semibold">{marketCategoryLabelKo(working.categoryId)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{copy.globe.marketIntentFieldPrice}</dt>
                      <dd className="font-semibold">{formatPriceRange(working)}</dd>
                    </div>
                    {!isSeeking && working.placeLabel ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{copy.globe.marketTradePlaceCurrentLabel}</dt>
                        <dd className="font-semibold text-right">{working.placeLabel}</dd>
                      </div>
                    ) : null}
                    {formatMarketMemoryPreview(working.detail, working.role) ? (
                      <div className="border-t border-black/[0.06] pt-2">
                        <dt className="text-muted-foreground">{copy.globe.marketMemoryReviewLabel}</dt>
                        <dd className="mt-1 font-medium leading-snug">
                          {formatMarketMemoryPreview(working.detail, working.role)}
                        </dd>
                        {working.detail.memoryRecord.experienceTags.length > 0 ? (
                          <dd className="mt-2 flex flex-wrap gap-1.5">
                            {working.detail.memoryRecord.experienceTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </dd>
                        ) : null}
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}
            </div>

            <div className="mt-3 shrink-0 border-t border-black/[0.06] pt-3">
              {step !== "review" && step !== "role" ? (
                <button
                  type="button"
                  className={cn(rimvioCompactPrimaryCtaClass(), "w-full gap-2")}
                  disabled={busy}
                  onClick={() => {
                    if (!validateStep()) {
                      return;
                    }
                    goNext();
                  }}
                >
                  {copy.globe.marketWizardNext}
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              ) : step === "review" ? (
                <>
                <button
                  type="button"
                  className={cn(rimvioCompactPrimaryCtaClass(), "w-full gap-2")}
                  disabled={busy}
                  onClick={() => void handleConfirm(true)}
                >
                  <Check className="size-4" aria-hidden />
                  {copy.globe.marketWizardPublishExternal}
                </button>
                <button
                  type="button"
                  className={cn(rimvioGhostCtaClass(), "mt-2 w-full gap-2")}
                  disabled={busy}
                  onClick={() => void handleConfirm(false)}
                >
                  {copy.globe.marketWizardSaveInternal}
                </button>
                </>
              ) : null}
              {steps.indexOf(step) > 0 ? (
                <button
                  type="button"
                  className={cn(rimvioGhostCtaClass(), "mt-2 w-full gap-1")}
                  disabled={busy}
                  onClick={goBack}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  {copy.globe.marketWizardBack}
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(rimvioGhostCtaClass(), "mt-2 w-full")}
                  disabled={busy}
                  onClick={() => onOpenChange(false)}
                >
                  {copy.globe.marketWizardLater}
                </button>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export const GlobeMarketIntentConfirmSheet = GlobeMarketIntentWizardSheet;
