"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Zap, X } from "lucide-react";
import { toast } from "sonner";
import {
  GlobeLodgingCheckoutDoneHero,
  GlobeLodgingSecurePayNote,
  GlobeLodgingStaySummaryCard,
  formatKrwCompact,
} from "@/components/globe/lodging/globe-lodging-booking-ui";
import { copy } from "@/lib/copy/human-ko";
import {
  executeLodgingHubCheckout,
  type HubLodgingCheckoutSession,
} from "@/lib/globe/hub-checkout";
import { assessExpressCheckoutReadiness } from "@/lib/payment-vault/assess-express-checkout-readiness";
import { openPaymentVaultSettings } from "@/lib/payment-vault/open-payment-vault-settings-bridge";
import { readPaymentVaultBundleClient } from "@/lib/payment-vault/read-payment-vault-bundle-client";
import type { ExpressCheckoutReadiness } from "@/lib/payment-vault/types";
import { openIdentityVaultSettings } from "@/lib/identity-vault/open-identity-vault-settings-bridge";
import { readIdentityVaultBundleClient } from "@/lib/identity-vault/read-identity-vault-bundle-client";

export type GlobeExpressCheckoutSheetProps = {
  open: boolean;
  session: HubLodgingCheckoutSession | null;
  onOpenChange: (open: boolean) => void;
  onComplete?: (input: { handoffHref: string }) => void;
  onOpenIdentitySettings?: () => void;
  onOpenPaymentSettings?: () => void;
  /** Fall back to standard multi-step checkout. */
  onUseStandardCheckout?: () => void;
};

/** Coupang-style one-tap checkout when Identity + Payment vault are complete. */
export function GlobeExpressCheckoutSheet({
  open,
  session,
  onOpenChange,
  onComplete,
  onOpenIdentitySettings,
  onOpenPaymentSettings,
  onUseStandardCheckout,
}: GlobeExpressCheckoutSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [readiness, setReadiness] = useState<ExpressCheckoutReadiness | null>(null);
  const [step, setStep] = useState<"confirm" | "done">("confirm");
  const [handoffHref, setHandoffHref] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setStep("confirm");
      setBusy(false);
      setHandoffHref(null);
      setReadiness(null);
      return;
    }
    void (async () => {
      const [identityBundle, paymentBundle] = await Promise.all([
        readIdentityVaultBundleClient(),
        readPaymentVaultBundleClient(),
      ]);
      setReadiness(
        assessExpressCheckoutReadiness({
          hubId: "lodging",
          identityBundle,
          paymentBundle,
        }),
      );
    })();
  }, [open]);

  if (!mounted || !session) {
    return null;
  }

  const isLiteApiCheckout = session.checkoutProvider === "liteapi";

  const handleExpressPay = async () => {
    if (!readiness?.ready || !readiness.paymentMethod) {
      return;
    }
    setBusy(true);
    try {
      const identityBundle = await readIdentityVaultBundleClient();
      const result = await executeLodgingHubCheckout({
        session,
        identityBundle,
        paymentMethod: readiness.paymentMethod,
      });
      if (!result.ok) {
        if (result.reason === "missing_identity") {
          toast.error(copy.hubCheckout.expressMissingIdentity);
          (onOpenIdentitySettings ?? openIdentityVaultSettings)();
          return;
        }
        toast.error(result.pgMessage ?? copy.hubCheckout.payFailed);
        return;
      }
      if (result.purchaseDeferred) {
        toast.message(
          isLiteApiCheckout ? copy.hubCheckout.liteapiPayHint : copy.hubCheckout.pgRedirect,
        );
        if (!isLiteApiCheckout) {
          onOpenChange(false);
        }
        return;
      }
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
          className="fixed inset-0 z-[86] flex items-end justify-center bg-black/35 px-0 pb-0 pt-8 backdrop-blur-[2px] sm:px-3 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
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
            className="relative flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] bg-[#fbfbfd] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            data-globe-express-checkout-sheet
          >
            <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[#d1d1d6]" aria-hidden />
            </div>

            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[#fff6e5] text-[#9a6700]">
                    <Zap className="size-4" aria-hidden />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                    {copy.hubCheckout.eyebrow}
                  </p>
                </div>
                <h2 className="mt-2 text-[20px] font-bold tracking-tight text-[#1d1d1f]">
                  {step === "done" ? copy.hubCheckout.doneTitle : copy.hubCheckout.expressTitle}
                </h2>
                {step === "confirm" ? (
                  <p className="mt-1 text-[13px] text-[#6e6e73]">{copy.hubCheckout.expressHint}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full bg-white text-[#515154] shadow-sm ring-1 ring-black/[0.06]"
                aria-label={copy.common.close}
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {step === "confirm" ? (
                <>
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

                  {readiness?.identityLabelKo ? (
                    <p className="rounded-xl bg-white px-3 py-2 text-[12px] text-[#6e6e73] ring-1 ring-black/[0.04]">
                      {copy.hubCheckout.identityLine(readiness.identityLabelKo)}
                    </p>
                  ) : null}

                  {readiness?.paymentLabelKo ? (
                    <p className="rounded-xl bg-white px-3 py-2 text-[12px] text-[#6e6e73] ring-1 ring-black/[0.04]">
                      {copy.hubCheckout.expressPaymentLine(readiness.paymentLabelKo)}
                    </p>
                  ) : null}

                  {readiness && !readiness.ready ? (
                    <div className="space-y-2 rounded-2xl bg-[#fff8f0] px-3 py-3 ring-1 ring-[#ff9500]/15">
                      {!readiness.identityComplete ? (
                        <button
                          type="button"
                          className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-[13px] font-medium text-[#1d1d1f]"
                          onClick={() =>
                            (onOpenIdentitySettings ?? openIdentityVaultSettings)()
                          }
                        >
                          {copy.hubCheckout.expressMissingIdentity}
                        </button>
                      ) : null}
                      {!readiness.paymentComplete ? (
                        <button
                          type="button"
                          className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-[13px] font-medium text-[#1d1d1f]"
                          onClick={() =>
                            (onOpenPaymentSettings ?? openPaymentVaultSettings)()
                          }
                        >
                          {copy.hubCheckout.expressMissingPayment}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <GlobeLodgingSecurePayNote>
                      {isLiteApiCheckout
                        ? copy.hubCheckout.liteapiPayHint
                        : copy.hubCheckout.secureNote}
                    </GlobeLodgingSecurePayNote>
                  )}

                  {isLiteApiCheckout && readiness?.ready ? (
                    <div
                      id="liteapi-payment-target"
                      className="min-h-[120px] rounded-[1.25rem] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                      data-liteapi-payment-target
                    />
                  ) : null}
                </>
              ) : (
                <GlobeLodgingCheckoutDoneHero
                  title={copy.hubCheckout.liteapiReturnDone}
                  subtitle={copy.hubCheckout.doneSubtitle}
                />
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-black/[0.05] bg-white/80 px-4 py-3 backdrop-blur-md">
              {step === "confirm" ? (
                <>
                  <button
                    type="button"
                    disabled={busy || !readiness?.ready}
                    onClick={() => void handleExpressPay()}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#ff6b00] to-[#ff9500] px-3 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(255,107,0,0.32)] disabled:opacity-45 active:scale-[0.99]"
                    data-globe-express-checkout-confirm
                  >
                    {busy
                      ? "…"
                      : copy.hubCheckout.expressPay(formatKrwCompact(session.amountKrw))}
                  </button>
                  {onUseStandardCheckout ? (
                    <button
                      type="button"
                      className="w-full rounded-2xl bg-[#f2f2f7] px-3 py-3 text-[13px] font-semibold text-[#515154]"
                      onClick={onUseStandardCheckout}
                    >
                      {copy.hubCheckout.expressOtherPay}
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  {handoffHref && !isLiteApiCheckout ? (
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
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-[#f2f2f7] px-3 py-3 text-[14px] font-semibold text-[#1d1d1f]"
                    onClick={() => onOpenChange(false)}
                  >
                    {copy.common.close}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
