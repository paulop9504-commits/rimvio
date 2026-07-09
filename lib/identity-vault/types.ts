/**
 * Identity Vault — encrypted travel credentials (user-scoped, not per-Context).
 * @see docs/RIMVIO_IDENTITY_VAULT.md
 */

import type { ContextHubServiceId } from "@/lib/ontology/context-hub-service-id";
import type { VaultObjectKind } from "@/lib/vault/types";

/** Vault kinds for identity objects (subset of VaultObjectKind). */
export type IdentityVaultKind = Extract<
  VaultObjectKind,
  | "identity_traveler_profile"
  | "identity_passport"
  | "identity_driver_license"
  | "identity_contact"
  | "identity_sensitive_national_id"
>;

export type IdentitySlotId =
  | "traveler"
  | "passport"
  | "driver_license"
  | "contact"
  | "sensitive_national_id";

export type TravelerProfilePayload = {
  readonly version: 1;
  readonly legalNameKo?: string;
  readonly givenNameRoman: string;
  readonly familyNameRoman: string;
  readonly dateOfBirth: string;
  readonly gender?: "M" | "F" | "X" | "unspecified";
  readonly nationalityIso2: string;
};

export type PassportDocumentPayload = {
  readonly version: 1;
  readonly passportNumber: string;
  readonly issuingCountryIso2: string;
  readonly expiryDate: string;
};

export type DriverLicensePayload = {
  readonly version: 1;
  readonly licenseNumber: string;
  readonly issuingCountryIso2: string;
  readonly expiryDate?: string;
  readonly licenseClass?: string;
};

export type ContactChannelPayload = {
  readonly version: 1;
  readonly phoneE164: string;
  readonly email: string;
  readonly emergencyName?: string;
  readonly emergencyPhoneE164?: string;
};

/** Opt-in only — never in default onboarding. */
export type SensitiveNationalIdPayload = {
  readonly version: 1;
  readonly kind: "kr_rrn" | "other";
  readonly value: string;
  readonly purposeHubId: ContextHubServiceId;
  readonly consentedAtIso: string;
};

export type IdentityVaultPayloadByKind = {
  identity_traveler_profile: TravelerProfilePayload;
  identity_passport: PassportDocumentPayload;
  identity_driver_license: DriverLicensePayload;
  identity_contact: ContactChannelPayload;
  identity_sensitive_national_id: SensitiveNationalIdPayload;
};

/** Vault object_key references only — safe for HubActionRecord logs. */
export type HubIdentityRefs = {
  readonly travelerProfileKey?: string;
  readonly passportKey?: string;
  readonly driverLicenseKey?: string;
  readonly contactKey?: string;
  readonly sensitiveNationalIdKey?: string;
};

/** Partner handoff / form prefill (ephemeral — do not persist full passport in action log). */
export type HubBookingIdentityFormFields = {
  readonly givenNameRoman?: string;
  readonly familyNameRoman?: string;
  readonly legalNameKo?: string;
  readonly dateOfBirth?: string;
  readonly gender?: string;
  readonly nationalityIso2?: string;
  readonly passportNumber?: string;
  readonly passportExpiry?: string;
  readonly passportCountryIso2?: string;
  readonly driverLicenseNumber?: string;
  readonly phoneE164?: string;
  readonly email?: string;
};

export type HubBookingIdentityResult = {
  readonly hubId: ContextHubServiceId;
  readonly identityRefs: HubIdentityRefs;
  readonly formFields: HubBookingIdentityFormFields;
  readonly maskedLabelKo: string;
  readonly warnings: readonly string[];
  readonly complete: boolean;
  readonly missingSlots: readonly IdentitySlotId[];
};

export type IdentityVaultBundle = {
  readonly traveler?: TravelerProfilePayload;
  readonly passport?: PassportDocumentPayload;
  readonly driverLicense?: DriverLicensePayload;
  readonly contact?: ContactChannelPayload;
  readonly sensitiveNationalId?: SensitiveNationalIdPayload;
};
