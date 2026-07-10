import { buildHubBookingIdentity } from "@/lib/identity-vault/build-hub-booking-identity";
import type { IdentityVaultBundle } from "@/lib/identity-vault/types";
import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
import type { ExpressCheckoutReadiness, PaymentVaultBundle } from "@/lib/payment-vault/types";

export function assessExpressCheckoutReadiness(input: {
  hubId: ContextHubServiceId;
  identityBundle: IdentityVaultBundle;
  paymentBundle: PaymentVaultBundle;
}): ExpressCheckoutReadiness {
  const identity = buildHubBookingIdentity({
    hubId: input.hubId,
    bundle: input.identityBundle,
  });
  const preference = input.paymentBundle.preference;
  const paymentComplete = Boolean(preference?.method && preference.displayLabelKo?.trim());

  return {
    ready: identity.complete && paymentComplete,
    identityComplete: identity.complete,
    paymentComplete,
    missingIdentitySlots: identity.missingSlots,
    paymentMethod: preference?.method ?? null,
    paymentLabelKo: preference?.displayLabelKo?.trim() ?? null,
    identityLabelKo: identity.complete ? identity.maskedLabelKo : null,
  };
}
