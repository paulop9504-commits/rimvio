/**
 * Map Identity Vault bundle → Hub booking form + safe refs for action log.
 */

import { copy } from "@/lib/copy/human-ko";
import {
  hubIdentitySlotRequirements,
  isLegalSensitiveIdHub,
} from "@/lib/identity-vault/hub-slot-registry";
import { maskPassportNumber } from "@/lib/identity-vault/mask-identity-field";
import { IDENTITY_VAULT_KEYS } from "@/lib/identity-vault/vault-keys";
import type {
  HubBookingIdentityFormFields,
  HubBookingIdentityResult,
  HubIdentityRefs,
  IdentitySlotId,
  IdentityVaultBundle,
} from "@/lib/identity-vault/types";
import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";

const PASSPORT_EXPIRY_WARN_DAYS = 183;

function parseIsoDate(iso: string): Date | null {
  const trimmed = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function passportExpiryWarning(expiryDate: string): string | null {
  const expiry = parseIsoDate(expiryDate);
  if (!expiry) {
    return copy.identityVault.warnPassportInvalidDate;
  }
  const ms = expiry.getTime() - Date.now();
  const days = ms / (24 * 60 * 60 * 1000);
  if (days < 0) {
    return copy.identityVault.warnPassportExpired;
  }
  if (days < PASSPORT_EXPIRY_WARN_DAYS) {
    return copy.identityVault.warnPassportExpiringSoon;
  }
  return null;
}

function slotSatisfied(
  slot: IdentitySlotId,
  bundle: IdentityVaultBundle,
  hubId: ContextHubServiceId,
): boolean {
  switch (slot) {
    case "traveler":
      return Boolean(bundle.traveler?.givenNameRoman && bundle.traveler.familyNameRoman);
    case "passport":
      return Boolean(bundle.passport?.passportNumber && bundle.passport.expiryDate);
    case "driver_license":
      return Boolean(bundle.driverLicense?.licenseNumber);
    case "contact":
      return Boolean(bundle.contact?.phoneE164 && bundle.contact.email);
    case "sensitive_national_id":
      return (
        isLegalSensitiveIdHub(hubId) &&
        Boolean(bundle.sensitiveNationalId?.value && bundle.sensitiveNationalId.purposeHubId === hubId)
      );
    default:
      return false;
  }
}

function buildFormFields(bundle: IdentityVaultBundle): HubBookingIdentityFormFields {
  const t = bundle.traveler;
  const p = bundle.passport;
  const d = bundle.driverLicense;
  const c = bundle.contact;
  return {
    ...(t?.givenNameRoman ? { givenNameRoman: t.givenNameRoman } : {}),
    ...(t?.familyNameRoman ? { familyNameRoman: t.familyNameRoman } : {}),
    ...(t?.legalNameKo ? { legalNameKo: t.legalNameKo } : {}),
    ...(t?.dateOfBirth ? { dateOfBirth: t.dateOfBirth } : {}),
    ...(t?.gender ? { gender: t.gender } : {}),
    ...(t?.nationalityIso2 ? { nationalityIso2: t.nationalityIso2 } : {}),
    ...(p?.passportNumber ? { passportNumber: p.passportNumber } : {}),
    ...(p?.expiryDate ? { passportExpiry: p.expiryDate } : {}),
    ...(p?.issuingCountryIso2 ? { passportCountryIso2: p.issuingCountryIso2 } : {}),
    ...(d?.licenseNumber ? { driverLicenseNumber: d.licenseNumber } : {}),
    ...(c?.phoneE164 ? { phoneE164: c.phoneE164 } : {}),
    ...(c?.email ? { email: c.email } : {}),
  };
}

function buildIdentityRefs(bundle: IdentityVaultBundle, hubId: ContextHubServiceId): HubIdentityRefs {
  return {
    ...(bundle.traveler ? { travelerProfileKey: IDENTITY_VAULT_KEYS.travelerProfile } : {}),
    ...(bundle.passport ? { passportKey: IDENTITY_VAULT_KEYS.passport } : {}),
    ...(bundle.driverLicense ? { driverLicenseKey: IDENTITY_VAULT_KEYS.driverLicense } : {}),
    ...(bundle.contact ? { contactKey: IDENTITY_VAULT_KEYS.contact } : {}),
    ...(bundle.sensitiveNationalId &&
    isLegalSensitiveIdHub(hubId) &&
    bundle.sensitiveNationalId.purposeHubId === hubId
      ? { sensitiveNationalIdKey: IDENTITY_VAULT_KEYS.sensitiveNationalId }
      : {}),
  };
}

function buildMaskedLabel(bundle: IdentityVaultBundle): string {
  const t = bundle.traveler;
  const name =
    t?.legalNameKo?.trim() ||
    [t?.familyNameRoman, t?.givenNameRoman].filter(Boolean).join(" ").trim() ||
    copy.identityVault.maskedLabelFallback;
  if (bundle.passport?.passportNumber) {
    return copy.identityVault.maskedLabelWithPassport(
      name,
      maskPassportNumber(bundle.passport.passportNumber),
    );
  }
  return name;
}

/** Apply vault bundle to a Hub booking — refs for logs, formFields for partner prefill. */
export function buildHubBookingIdentity(input: {
  hubId: ContextHubServiceId;
  bundle: IdentityVaultBundle;
}): HubBookingIdentityResult {
  const requirements = hubIdentitySlotRequirements(input.hubId);
  const missingSlots: IdentitySlotId[] = [];
  const warnings: string[] = [];

  for (const req of requirements) {
    if (req.required && !slotSatisfied(req.slot, input.bundle, input.hubId)) {
      missingSlots.push(req.slot);
    }
  }

  if (input.bundle.passport?.expiryDate) {
    const warn = passportExpiryWarning(input.bundle.passport.expiryDate);
    if (warn) {
      warnings.push(warn);
    }
  }

  return {
    hubId: input.hubId,
    identityRefs: buildIdentityRefs(input.bundle, input.hubId),
    formFields: buildFormFields(input.bundle),
    maskedLabelKo: buildMaskedLabel(input.bundle),
    warnings,
    complete: missingSlots.length === 0,
    missingSlots,
  };
}
