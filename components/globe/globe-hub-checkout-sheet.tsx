"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { toast } from "sonner";
import {
  GlobeLodgingCheckoutDoneHero,
  GlobeLodgingCheckoutStepBar,
  GlobeLodgingSecurePayNote,
  GlobeLodgingStaySummaryCard,
  formatKrwCompact,
} from "@/components/globe/lodging/globe-lodging-booking-ui";
import { copy } from "@/lib/copy/human-ko";
import {
  executeLodgingHubCheckout,
  type HubCheckoutPaymentMethod,
  type HubLodgingCheckoutSession,
} from "@/lib/globe/hub-checkout";
import { resolveLiteApiPaymentTargetId, resolveLiteApiPaymentTargetSelector } from "@/lib/globe/hub-checkout/liteapi/resolve-liteapi-payment-target";
import { buildHubBookingIdentity } from "@/lib/identity-vault/build-hub-booking-identity";
import { readIdentityVaultBundleClient } from "@/lib/identity-vault/read-identity-vault-bundle-client";
import type { IdentitySlotId } from "@/lib/identity-vault/types";
import { cn } from "@/lib/utils";

export type GlobeHubCheckoutSheetProps = {
  open: boolean;
  session: HubLodgingCheckoutSession | null;
  onOpenChange: (open: boolean) => void;
  onComplete?: (input: { handoffHref: string }) => void;
  onOpenIdentitySettings?: () => void;
};

type CheckoutStep = "review" | "pay" | "done";

function missingSlotMessage(slot: IdentitySlotId): string {
  switch (slot) {
    case "traveler":
      return copy.identityVault.missingTraveler;
    case "passport":
      return copy.identityVault.missingPassport;
    case "driver_license":
      return copy.identityVault.missingLicense;
    case "contact":
      return copy.identityVault.missingContact;
    case "sensitive_national_id":
      return copy.identityVault.sensitiveIdOptInTitle;
  }
}

const PAYMENT_METHODS: readonly {
  id: HubCheckoutPaymentMethod;
  label: string;
}[] = [
  { id: "in_app_card", label: copy.hubCheckout.payCard },
  { id: "kakaopay", label: copy.hubCheckout.payKakao },
  { id: "tosspay", label: copy.hubCheckout.payToss },
];

/** In-app Hub checkout — review → pay → done. */
export function GlobeHubCheckoutSheet({
  open,
  session,
  onOpenChange,
  onComplete,
  onOpenIdentitySettings,
}: GlobeHubCheckoutSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<CheckoutStep>("review");
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<HubCheckoutPaymentMethod>("in_app_card");
  const [maskedIdentityKo, setMaskedIdentityKo] = useState<string | null>(null);
  const [handoffHref, setHandoffHref] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const payInFlightRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("review");
      setBusy(false);
      payInFlightRef.current = false;
      setPaymentMethod("in_app_card");
      setMaskedIdentityKo(null);
      setHandoffHref(null);
      setConfirmationCode(null);
    }
  }, [open]);

  if (!mounted || !session) {
    return null;
  }

  const isLiteApiCheckout = session.checkoutProvider === "liteapi";
  const liteApiPaymentTargetId = resolveLiteApiPaymentTargetId(session.sessionId);
  const liteApiPaymentTargetSelector = resolveLiteApiPaymentTargetSelector(
    session.sessionId,
  );

  const handleContinueToPay = async () => {
    const bundle = await readIdentityVaultBundleClient();
    const built = buildHubBookingIdentity({ hubId: "lodging", bundle });
    if (!built.complete) {
      toast.error(
        built.missingSlots[0]
          ? missingSlotMessage(built.missingSlots[0])
          : copy.globe.lodgingRoomCardIdentityMissing,
      );
      onOpenIdentitySettings?.();
      return;
    }
    setMaskedIdentityKo(built.maskedLabelKo);
    setStep("pay");
  };

  const handleConfirmPay = async () => {
    if (busy || payInFlightRef.current) {
      return;
    }
    payInFlightRef.current = true;
    setBusy(true);
    try {
      const bundle = await readIdentityVaultBundleClient();
      const result = await executeLodgingHubCheckout({
        session,
        identityBundle: bundle,
        paymentMethod,
        paymentTargetSelector: isLiteApiCheckout
          ? liteApiPaymentTargetSelector
          : undefined,
      });
      if (!result.ok) {
        if (result.reason === "missing_identity") {
          toast.error(
            result.missingSlots?.[0]
              ? missingSlotMessage(result.missingSlots[0])
              : copy.globe.lodgingRoomCardIdentityMissing,
          );
          onOpenIdentitySettings?.();
          setStep("review");
          payInFlightRef.current = false;
          return;
        }
        if (result.reason === "pg_failed") {
          toast.error(result.pgMessage ?? copy.hubCheckout.payFailed);
          payInFlightRef.current = false;
          return;
        }
        toast.error(copy.hubCheckout.payFailed);
        payInFlightRef.current = false;
        return;
      }
      if (result.purchaseDeferred) {
        toast.message(
          isLiteApiCheckout ? copy.hubCheckout.liteapiPayHint : copy.hubCheckout.pgRedirect,
        );
        if (!isLiteApiCheckout) {
          onOpenChange(false);
          payInFlightRef.current = false;
        }
        return;
      }
      payInFlightRef.current = false;
      setMaskedIdentityKo(result.maskedIdentityKo);
      setHandoffHref(result.handoffHref);
      setStep("done");
      toast.success(copy.hubCheckout.payDone);
      onComplete?.({ handoffHref: result.handoffHref });
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/35 px-0 pb-0 pt-8 backdrop-blur-[2px] sm:px-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label={copy.common.close}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className="relative flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-[#fbfbfd] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            data-globe-hub-checkout-sheet
          >
            <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[#d1d1d6]" aria-hidden />
            </div>

            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  {copy.hubCheckout.eyebrow}
                </p>
                <h2 className="mt-0.5 text-[20px] font-bold tracking-tight text-[#1d1d1f]">
                  {step === "done"
                    ? copy.hubCheckout.doneTitle
                    : copy.hubCheckout.title}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {step === "pay" ? (
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-full bg-white text-[#515154] shadow-sm ring-1 ring-black/[0.06]"
                    aria-label="이전"
                    onClick={() => setStep("review")}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full bg-white text-[#515154] shadow-sm ring-1 ring-black/[0.06]"
                  aria-label={copy.common.close}
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="px-4 pb-3">
              <GlobeLodgingCheckoutStepBar
                step={step}
                labels={{
                  review: copy.hubCheckout.stepReview,
                  pay: copy.hubCheckout.stepPay,
                  done: copy.hubCheckout.stepDone,
                }}
              />
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {step !== "done" ? (
                <GlobeLodgingStaySummaryCard
                  propertyName={session.propertyName}
                  roomTitle={session.offer.title}
                  occupancyLabel={session.offer.occupancyLabelKo}
                  checkInIso={session.checkInIso}
                  checkOutIso={session.checkOutIso}
                  amountKrw={session.amountKrw}
                  coverImageUrl={session.coverImageUrl}
                  partnerLabel={session.partnerLabel}
                  refundable={session.refundable}
                  liveRate={isLiteApiCheckout}
                />
              ) : (
                <GlobeLodgingCheckoutDoneHero
                  confirmationCode={confirmationCode}
                  title={copy.hubCheckout.liteapiReturnDone}
                  subtitle={copy.hubCheckout.doneSubtitle}
                />
              )}

              {maskedIdentityKo && step !== "done" ? (
                <p className="rounded-xl bg-white px-3 py-2 text-[12px] text-[#6e6e73] ring-1 ring-black/[0.04]">
                  {copy.hubCheckout.identityLine(maskedIdentityKo)}
                </p>
              ) : null}

              {step === "pay" ? (
                <div className="space-y-3">
                  <GlobeLodgingSecurePayNote>
                    {isLiteApiCheckout
                      ? copy.hubCheckout.liteapiPayHint
                      : copy.hubCheckout.secureNote}
                  </GlobeLodgingSecurePayNote>

                  {isLiteApiCheckout ? (
                    <div
                      id={liteApiPaymentTargetId}
                      className="min-h-[148px] rounded-[1.25rem] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                      data-liteapi-payment-target
                    />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          disabled={busy}
                          onClick={() => setPaymentMethod(method.id)}
                          className={cn(
                            "rounded-2xl px-2 py-3 text-[12px] font-semibold transition active:scale-[0.98]",
                            paymentMethod === method.id
                              ? "bg-[#0071e3] text-white shadow-[0_8px_18px_rgba(0,113,227,0.28)]"
                              : "bg-white text-[#1d1d1f] ring-1 ring-black/[0.06]",
                          )}
                          data-globe-hub-checkout-pay-method={method.id}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {step === "done" && !isLiteApiCheckout ? (
                <p className="text-center text-[12px] leading-relaxed text-[#6e6e73]">
                  {copy.hubCheckout.doneHint}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 space-y-2 border-t border-black/[0.05] bg-white/80 px-4 py-3 backdrop-blur-md">
              {step === "review" ? (
                <>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-[#0071e3] px-3 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,113,227,0.28)] active:scale-[0.99]"
                    onClick={() => void handleContinueToPay()}
                  >
                    {copy.hubCheckout.continuePay}
                  </button>
                  {onOpenIdentitySettings ? (
                    <button
                      type="button"
                      className="w-full rounded-2xl bg-[#f2f2f7] px-3 py-3 text-[13px] font-medium text-[#1d1d1f]"
                      onClick={onOpenIdentitySettings}
                    >
                      {copy.identityVault.settingsTitle}
                    </button>
                  ) : null}
                </>
              ) : null}

              {step === "pay" ? (
                <button
                  type="button"
                  disabled={busy}
                  className="w-full rounded-2xl bg-[#1d1d1f] px-3 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] disabled:opacity-50 active:scale-[0.99]"
                  onClick={() => void handleConfirmPay()}
                  data-globe-hub-checkout-confirm
                >
                  {busy ? "…" : copy.hubCheckout.confirmPay(formatKrwCompact(session.amountKrw))}
                </button>
              ) : null}

              {step === "done" && handoffHref && !isLiteApiCheckout ? (
                <button
                  type="button"
                  className="w-full rounded-2xl bg-[#0071e3] px-3 py-3.5 text-[15px] font-semibold text-white"
                  onClick={() => {
                    window.open(handoffHref, "_blank", "noopener,noreferrer");
                  }}
                >
                  {copy.hubCheckout.partnerHandoff}
                </button>
              ) : null}

              {step === "done" ? (
                <button
                  type="button"
                  className="w-full rounded-2xl bg-[#f2f2f7] px-3 py-3 text-[14px] font-semibold text-[#1d1d1f]"
                  onClick={() => onOpenChange(false)}
                >
                  {copy.common.close}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
