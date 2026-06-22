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
import { MarketPrioritySlotFields } from "@/components/market/market-priority-slot-fields";
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
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
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
import { cn } from "@/lib/utils";

export type GlobeMarketIntentWizardSheetProps = {
  draft: MarketIntentDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: (eventId: string) => void;
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
    case "recognize":
      return copy.globe.marketWizardStepRecognize;
    case "priority":
      return copy.globe.marketPriorityCardEyebrow;
    case "photos":
      return copy.globe.marketWizardStepPhotos;
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
}: GlobeMarketIntentWizardSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<MarketWizardStepId>("recognize");
  const [working, setWorking] = useState<MarketIntentDraft | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);

  const steps = useMemo(
    () => (working ? marketWizardSteps(working.role) : []),
    [working],
  );
  const progress = working ? marketWizardProgress(working.role, step) : { current: 1, total: 1 };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !draft) {
      return;
    }
    setWorking({ ...draft, detail: { ...draft.detail, prioritySlots: { ...draft.detail.prioritySlots } } });
    setStep("recognize");
    setPhotoFiles([]);
    setPhotoPreviews([]);
  }, [draft, open]);

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

  const validateStep = useCallback((): boolean => {
    if (!working) {
      return false;
    }
    if (step === "priority") {
      const name = working.detail.productName.trim();
      if (!name) {
        toast.message(copy.globe.marketWizardValidationProduct);
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

  const handleConfirm = useCallback(async () => {
    if (!working || busy) {
      return;
    }
    setBusy(true);
    try {
      const name = working.detail.productName.trim() || working.title.trim();
      const finalDraft: MarketIntentDraft = {
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
      };
      await commitMarketIntentFromDraft(finalDraft, {
        photoFiles: photoFiles.length > 0 ? photoFiles : undefined,
      });
      onConfirmed?.(finalDraft.eventId);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }, [busy, onConfirmed, onOpenChange, photoFiles, working]);

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
            className={rimvioSheetBackdropClass()}
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
              "flex max-h-[min(92dvh,720px)] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
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
                        {working.detail.sourceText || working.title}
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

              {step === "place" ? (
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
                  </dl>
                </div>
              ) : null}
            </div>

            <div className="mt-3 shrink-0 border-t border-black/[0.06] pt-3">
              {step !== "review" ? (
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
              ) : (
                <button
                  type="button"
                  className={cn(rimvioCompactPrimaryCtaClass(), "w-full gap-2")}
                  disabled={busy}
                  onClick={() => void handleConfirm()}
                >
                  <Check className="size-4" aria-hidden />
                  {copy.globe.marketWizardConfirm}
                </button>
              )}
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
