/**
 * Attach Identity Vault refs to Hub reserve/purchase actions.
 * @see docs/RIMVIO_IDENTITY_VAULT.md
 */

import { buildHubBookingIdentity } from "@/lib/identity-vault/build-hub-booking-identity";
import type { IdentityVaultBundle } from "@/lib/identity-vault/types";
import {
  createPurchaseAction,
  createReserveAction,
  type HubAction,
  type HubActionPurchasePayload,
  type HubActionReservePayload,
} from "@/lib/globe/resource/hub-action-record";
import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";

type ReserveWithIdentityInput = Parameters<typeof createReserveAction>[0] & {
  hubId: ContextHubServiceId;
  identityBundle: IdentityVaultBundle;
};

type PurchaseWithIdentityInput = Parameters<typeof createPurchaseAction>[0] & {
  hubId: ContextHubServiceId;
  identityBundle: IdentityVaultBundle;
};

function mergeIdentityRefs<T extends { identityRefs?: HubActionReservePayload["identityRefs"] }>(
  payload: T,
  hubId: ContextHubServiceId,
  bundle: IdentityVaultBundle,
): T {
  const built = buildHubBookingIdentity({ hubId, bundle });
  return {
    ...payload,
    identityRefs: {
      ...payload.identityRefs,
      ...built.identityRefs,
    },
  };
}

export function createReserveActionWithIdentity(
  input: ReserveWithIdentityInput,
): { action: HubAction; booking: ReturnType<typeof buildHubBookingIdentity> } {
  const booking = buildHubBookingIdentity({
    hubId: input.hubId,
    bundle: input.identityBundle,
  });
  const action = createReserveAction({
    ...input,
    payload: mergeIdentityRefs(input.payload, input.hubId, input.identityBundle),
  });
  return { action, booking };
}

export function createPurchaseActionWithIdentity(
  input: PurchaseWithIdentityInput,
): { action: HubAction; booking: ReturnType<typeof buildHubBookingIdentity> } {
  const booking = buildHubBookingIdentity({
    hubId: input.hubId,
    bundle: input.identityBundle,
  });
  const action = createPurchaseAction({
    ...input,
    payload: mergeIdentityRefs(input.payload, input.hubId, input.identityBundle),
  });
  return { action, booking };
}
