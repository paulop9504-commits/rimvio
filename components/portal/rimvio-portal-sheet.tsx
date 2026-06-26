"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
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

type IntentVisual = {
  Icon: LucideIcon;
  accent: string;
  tileBg: string;
  iconRing: string;
  tileShadow: string;
};

const INTENT_VISUAL: Record<PortalIntentId, IntentVisual> = {
  offer: {
    Icon: ArrowUpFromLine,
    accent: "#3182f6",
    tileBg: "bg-gradient-to-b from-[#3182f6]/[0.07] to-white",
    iconRing: "bg-[#3182f6]/10 ring-[#3182f6]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(49,130,246,0.10)]",
  },
  seek: {
    Icon: ArrowDownToLine,
    accent: "#ef2b2b",
    tileBg: "bg-gradient-to-b from-[#ef2b2b]/[0.07] to-white",
    iconRing: "bg-[#ef2b2b]/10 ring-[#ef2b2b]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(239,43,43,0.10)]",
  },
  together: {
    Icon: Users,
    accent: "#f59e0b",
    tileBg: "bg-gradient-to-b from-[#f59e0b]/[0.08] to-white",
    iconRing: "bg-[#f59e0b]/10 ring-[#f59e0b]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(245,158,11,0.10)]",
  },
  join: {
    Icon: CalendarDays,
    accent: "#8b5cf6",
    tileBg: "bg-gradient-to-b from-[#8b5cf6]/[0.08] to-white",
    iconRing: "bg-[#8b5cf6]/10 ring-[#8b5cf6]/20",
    tileShadow: "shadow-[0_10px_28px_rgba(139,92,246,0.10)]",
  },
};

const TILE_MOTION = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: index * 0.05, duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  }),
};

function PortalIntentTile({
  intentId,
  title,
  body,
  index,
  onClick,
}: {
  intentId: PortalIntentId;
  title: string;
  body: string;
  index: number;
  onClick: () => void;
}) {
  const visual = INTENT_VISUAL[intentId];
  const { Icon } = visual;

  return (
    <motion.button
      type="button"
      custom={index}
      variants={TILE_MOTION}
      initial="hidden"
      animate="show"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-[148px] flex-col items-center justify-center gap-3 overflow-hidden",
        "rounded-[1.35rem] px-3 py-4 text-center",
        "ring-1 ring-black/[0.05]",
        "transition-[box-shadow,ring-color] duration-200",
        "active:ring-black/[0.08]",
        visual.tileBg,
        visual.tileShadow,
      )}
      data-portal-intent={intentId}
    >
      <span
        className={cn(
          "flex size-[52px] items-center justify-center rounded-2xl ring-1",
          "transition-transform duration-200 group-active:scale-95",
          visual.iconRing,
        )}
        aria-hidden
      >
        <Icon className="size-[22px]" strokeWidth={2.1} style={{ color: visual.accent }} />
      </span>
      <span className="min-w-0 space-y-1 px-1">
        <span className="block text-[15px] font-semibold leading-tight tracking-tight text-[#191f28]">
          {title}
        </span>
        <span className="block text-[12px] font-medium leading-snug text-[#6b7684]">
          {body}
        </span>
      </span>
    </motion.button>
  );
}

function PortalCategoryRow({
  label,
  implemented,
  index,
  onClick,
}: {
  label: string;
  implemented: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      custom={index}
      variants={TILE_MOTION}
      initial="hidden"
      animate="show"
      whileTap={{ scale: 0.985 }}
      disabled={!implemented}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left",
        "ring-1 ring-black/[0.05]",
        implemented
          ? "bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] active:bg-[#f9fafb]"
          : "bg-[#f2f4f6]/80 opacity-50",
      )}
    >
      <span className="text-[15px] font-semibold tracking-tight text-[#191f28]">{label}</span>
      {implemented ? (
        <ChevronRight className="size-4 shrink-0 text-[#b0b8c1]" aria-hidden />
      ) : (
        <span className="shrink-0 text-[11px] font-medium text-[#8b95a1]">
          {copy.globe.contextHubServiceSoonBadge}
        </span>
      )}
    </motion.button>
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
  const activeVisual = intentId ? INTENT_VISUAL[intentId] : null;
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
              "z-[10071] flex max-h-[min(92dvh,720px)] flex-col overflow-hidden",
              "px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0",
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            data-rimvio-portal-sheet
            data-rimvio-portal-step={step}
            data-rimvio-portal-source={source}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#3182f6]/[0.06] to-transparent"
              aria-hidden
            />

            <div className="relative shrink-0 px-5 pt-3">
              <div className="mb-4 flex justify-center">
                <span className="h-1 w-9 rounded-full bg-black/10" aria-hidden />
              </div>

              <div className="relative flex items-start justify-center pb-1">
                {step === "category" ? (
                  <button
                    type="button"
                    className="absolute left-0 top-0.5 flex size-9 items-center justify-center rounded-full bg-black/[0.04] text-[#4e5968] transition active:bg-black/[0.07]"
                    onClick={() => setStep("intent")}
                    aria-label={copy.portal.backToIntents}
                  >
                    <ChevronLeft className="size-[18px]" aria-hidden />
                  </button>
                ) : null}

                <button
                  type="button"
                  className={cn(rimvioSheetCloseBtnClass(), "absolute right-0 top-0")}
                  onClick={close}
                  aria-label={copy.portal.closeAria}
                >
                  <X className="size-4" aria-hidden />
                </button>

                <div className="max-w-[280px] px-10 text-center">
                  {step === "category" && activeVisual ? (
                    <span
                      className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-xl ring-1"
                      style={{
                        backgroundColor: `${activeVisual.accent}14`,
                        boxShadow: `inset 0 0 0 1px ${activeVisual.accent}22`,
                      }}
                      aria-hidden
                    >
                      <activeVisual.Icon
                        className="size-[18px]"
                        strokeWidth={2.1}
                        style={{ color: activeVisual.accent }}
                      />
                    </span>
                  ) : (
                    <p className="text-[11px] font-semibold tracking-[0.06em] text-[#3182f6]">
                      {copy.portal.projectionEyebrow}
                    </p>
                  )}
                  <h2 className="text-[22px] font-bold leading-tight tracking-tight text-[#191f28]">
                    {step === "intent"
                      ? copy.portal.homeTitle
                      : copy.portal.categoryTitle(activeIntent?.labelKo ?? "")}
                  </h2>
                  <p className={cn("mt-1.5", RIMVIO_TYPE.caption, "text-[13px] leading-relaxed text-[#6b7684]")}>
                    {step === "intent" ? copy.portal.homeBody : copy.portal.categoryBody}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4">
              {step === "intent" ? (
                <div className="grid grid-cols-2 gap-3 pb-2">
                  {listPortalIntents().map((intent, index) => (
                    <PortalIntentTile
                      key={intent.id}
                      intentId={intent.id}
                      title={intent.labelKo}
                      body={intent.bodyKo}
                      index={index}
                      onClick={() => pickIntent(intent.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 pb-2">
                  {categories.map((category, index) => (
                    <div key={category.id} data-portal-category={category.id}>
                      <PortalCategoryRow
                        label={category.labelKo}
                        implemented={category.implemented}
                        index={index}
                        onClick={() => pickCategory(category.id)}
                      />
                    </div>
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
