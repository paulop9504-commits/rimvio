import type { IdentityVaultKind } from "@/lib/identity-vault/types";

const PRIMARY = "primary";

export const IDENTITY_VAULT_KEYS = {
  travelerProfile: `identity:traveler:${PRIMARY}`,
  passport: `identity:passport:${PRIMARY}`,
  driverLicense: `identity:driver_license:${PRIMARY}`,
  contact: `identity:contact:${PRIMARY}`,
  sensitiveNationalId: `identity:sensitive_national_id:${PRIMARY}`,
} as const;

export function identityVaultKindForKey(objectKey: string): IdentityVaultKind | null {
  const key = objectKey.trim();
  if (key === IDENTITY_VAULT_KEYS.travelerProfile) {
    return "identity_traveler_profile";
  }
  if (key === IDENTITY_VAULT_KEYS.passport) {
    return "identity_passport";
  }
  if (key === IDENTITY_VAULT_KEYS.driverLicense) {
    return "identity_driver_license";
  }
  if (key === IDENTITY_VAULT_KEYS.contact) {
    return "identity_contact";
  }
  if (key === IDENTITY_VAULT_KEYS.sensitiveNationalId) {
    return "identity_sensitive_national_id";
  }
  return null;
}

export const DEFAULT_IDENTITY_VAULT_KINDS: readonly IdentityVaultKind[] = [
  "identity_traveler_profile",
  "identity_passport",
  "identity_driver_license",
  "identity_contact",
];
