"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import {
  RIMVIO_TYPE,
  rimvioBottomSheetClass,
  rimvioSheetBackdropClass,
  rimvioSheetCloseBtnClass,
} from "@/lib/design/rimvio-ontology";
import type { MarketIntentDraft } from "@/lib/globe/market/market-intent-types";
import { buildPortalMarketDraft } from "@/lib/portal/build-portal-market-draft";
import {
  getPortalIntent,
  listPortalCategoriesForIntent,
  listPortalIntents,
} from "@/lib/portal/portal-intent-registry";
import type {
  PortalCategoryId,
  PortalIntentId,
  PortalOpenSource,
  PortalSheetStep,
} from "@/lib/portal/portal-types";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { cn } from "@/lib/utils";

export type RimvioPortalSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventCandidate | null;
  composeText?: string;
  source?: PortalOpenSource;
  initialIntentId?: PortalIntentId | null;
  liveLat?: number | null;
  liveLng?: number | null;
  onLaunchMarketProjection: (input: {
    draft: MarketIntentDraft;
    eventId: string;
  }) => void;
};

function IntentCard({
  emoji,
  title,
  body,
  onClick,
}: {
  emoji: string;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl bg-muted/35 px-4 py-3.5 text-left ring-1 ring-black/[0.04] transition-colors active:bg-muted/55"
    >
      <span className="text-2xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block text-[16px] font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
          {body}
        </span>
      </span>
    </button>
  );
}

/** Intent-first Portal — L1 home + L2 category; L3 projection via market wizard. */
export function RimvioPortalSheet({
  open,
  onOpenChange,
  event,
  composeText,
  source = "composer",
  initialIntentId = null,
  liveLat = null,
  liveLng = null,
  onLaunchMarketProjection,
}: RimvioPortalSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<PortalSheetStep>("intent");
  const [intentId, setIntentId] = useState<PortalIntentId | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("intent");
      setIntentId(null);
      return;
    }
    if (initialIntentId) {
      setIntentId(initialIntentId);
      setStep("category");
    }
  }, [initialIntentId, open]);

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

  const activeIntent = intentId ? getPortalIntent(intentId) : null;
  const categories = useMemo(
    () => (intentId ? listPortalCategoriesForIntent(intentId) : []),
    [intentId],
  );

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const pickIntent = useCallback((next: PortalIntentId) => {
    setIntentId(next);
    setStep("category");
  }, []);

  const pickCategory = useCallback(
    (categoryId: PortalCategoryId) => {
      if (!intentId || !event) {
        toast.message(copy.globe.ingestAttachFail);
        return;
      }
      const category = listPortalCategoriesForIntent(intentId).find(
        (row) => row.id === categoryId,
      );
      if (!category?.implemented) {
        toast.message(copy.portal.categorySoonToast);
        return;
      }
      if (!category.marketProjection) {
        toast.message(copy.portal.categorySoonToast);
        return;
      }
      const draft = buildPortalMarketDraft({
        event,
        intentId,
        composeText,
        liveLat,
        liveLng,
      });
      if (!draft) {
        toast.message(copy.portal.categorySoonToast);
        return;
      }
      onLaunchMarketProjection({ draft, eventId: event.id });
      close();
    },
    [close, composeText, event, intentId, liveLat, liveLng, onLaunchMarketProjection],
  );

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={copy.portal.closeAria}
            className={cn(rimvioSheetBackdropClass(), "z-[10070]")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cn(
              rimvioBottomSheetClass(),
              "z-[10071] flex max-h-[min(92dvh,720px)] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            data-rimvio-portal-sheet
            data-rimvio-portal-step={step}
            data-rimvio-portal-source={source}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <div className="min-w-0">
                {step === "category" && activeIntent ? (
                  <button
                    type="button"
                    className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-primary"
                    onClick={() => setStep("intent")}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    {copy.portal.backToIntents}
                  </button>
                ) : null}
                <p className={cn(RIMVIO_TYPE.eyebrow, "text-primary")}>
                  {copy.portal.projectionEyebrow}
                </p>
                <p className={cn(RIMVIO_TYPE.headline, "text-lg")}>
                  {step === "intent"
                    ? copy.portal.homeTitle
                    : copy.portal.categoryTitle(activeIntent?.labelKo ?? "")}
                </p>
                <p className={cn("mt-0.5", RIMVIO_TYPE.caption)}>
                  {step === "intent" ? copy.portal.homeBody : copy.portal.categoryBody}
                </p>
              </div>
              <button
                type="button"
                className={rimvioSheetCloseBtnClass()}
                onClick={close}
                aria-label={copy.portal.closeAria}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {step === "intent" ? (
                <div className="space-y-2.5">
                  {listPortalIntents().map((intent) => (
                    <IntentCard
                      key={intent.id}
                      emoji={intent.emoji}
                      title={intent.labelKo}
                      body={intent.bodyKo}
                      onClick={() => pickIntent(intent.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      disabled={!category.implemented}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ring-1 ring-black/[0.04]",
                        category.implemented
                          ? "bg-card active:bg-muted/40"
                          : "bg-muted/25 opacity-55",
                      )}
                      data-portal-category={category.id}
                      onClick={() => pickCategory(category.id)}
                    >
                      <span className="text-[15px] font-semibold text-foreground">
                        {category.labelKo}
                      </span>
                      {!category.implemented ? (
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {copy.globe.contextHubServiceSoonBadge}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
