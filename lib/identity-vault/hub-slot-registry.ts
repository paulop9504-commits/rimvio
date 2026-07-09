/**
 * Which identity slots each Hub requires for booking prefill.
 * @see docs/RIMVIO_IDENTITY_VAULT.md
 */

import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
import type { IdentitySlotId } from "@/lib/identity-vault/types";

export type HubIdentitySlotRequirement = {
  readonly slot: IdentitySlotId;
  readonly required: boolean;
};

const FLIGHT_SLOTS: readonly HubIdentitySlotRequirement[] = [
  { slot: "traveler", required: true },
  { slot: "passport", required: true },
  { slot: "contact", required: true },
];

const RENTAL_SLOTS: readonly HubIdentitySlotRequirement[] = [
  { slot: "traveler", required: true },
  { slot: "driver_license", required: true },
  { slot: "contact", required: true },
];

const LODGING_SLOTS: readonly HubIdentitySlotRequirement[] = [
  { slot: "traveler", required: true },
  { slot: "contact", required: true },
];

const TICKET_SLOTS: readonly HubIdentitySlotRequirement[] = [];

/** Hubs that may request opt-in sensitive national id (empty until legal review). */
export const LEGAL_SENSITIVE_ID_HUBS: readonly ContextHubServiceId[] = [];

export function hubIdentitySlotRequirements(
  hubId: ContextHubServiceId,
): readonly HubIdentitySlotRequirement[] {
  switch (hubId) {
    case "flight":
      return FLIGHT_SLOTS;
    case "rental_car":
      return RENTAL_SLOTS;
    case "lodging":
      return LODGING_SLOTS;
    case "ticket":
      return TICKET_SLOTS;
    default:
      return [];
  }
}

export function isLegalSensitiveIdHub(hubId: ContextHubServiceId): boolean {
  return LEGAL_SENSITIVE_ID_HUBS.includes(hubId);
}

export function hubSupportsIdentityPrefill(hubId: ContextHubServiceId): boolean {
  return hubIdentitySlotRequirements(hubId).length > 0;
}
