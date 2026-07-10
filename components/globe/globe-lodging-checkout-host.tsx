"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GlobeExpressCheckoutSheet } from "@/components/globe/globe-express-checkout-sheet";
import { GlobeHubCheckoutSheet } from "@/components/globe/globe-hub-checkout-sheet";
import { copy } from "@/lib/copy/human-ko";
import {
  closeLodgingCheckoutState,
  subscribeLodgingCheckoutState,
  switchLodgingCheckoutToStandard,
  type LodgingCheckoutActiveState,
} from "@/lib/globe/hub-checkout/lodging-checkout-controller";
import { openIdentityVaultSettings } from "@/lib/identity-vault/open-identity-vault-settings-bridge";
import { openPaymentVaultSettings } from "@/lib/payment-vault/open-payment-vault-settings-bridge";

/** Single global lodging checkout surface — prevents duplicate payment overlays. */
export function GlobeLodgingCheckoutHost() {
  const [active, setActive] = useState<LodgingCheckoutActiveState | null>(null);

  useEffect(() => subscribeLodgingCheckoutState(setActive), []);

  const session = active?.session ?? null;
  const expressOpen = active?.mode === "express";
  const standardOpen = active?.mode === "standard";

  return (
    <>
      <GlobeExpressCheckoutSheet
        open={expressOpen}
        session={session}
        onOpenChange={(next) => {
          if (!next) {
            closeLodgingCheckoutState();
          }
        }}
        onOpenIdentitySettings={openIdentityVaultSettings}
        onOpenPaymentSettings={openPaymentVaultSettings}
        onUseStandardCheckout={() => {
          switchLodgingCheckoutToStandard();
        }}
        onComplete={() => {
          toast.success(copy.globe.lodgingRoomCardReserveDone);
        }}
      />

      <GlobeHubCheckoutSheet
        open={standardOpen}
        session={session}
        onOpenChange={(next) => {
          if (!next) {
            closeLodgingCheckoutState();
          }
        }}
        onOpenIdentitySettings={openIdentityVaultSettings}
        onComplete={() => {
          toast.success(copy.globe.lodgingRoomCardReserveDone);
        }}
      />
    </>
  );
}
