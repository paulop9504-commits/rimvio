export type {
  ContactChannelPayload,
  DriverLicensePayload,
  HubBookingIdentityFormFields,
  HubBookingIdentityResult,
  HubIdentityRefs,
  IdentitySlotId,
  IdentityVaultBundle,
  IdentityVaultKind,
  IdentityVaultPayloadByKind,
  PassportDocumentPayload,
  SensitiveNationalIdPayload,
  TravelerProfilePayload,
} from "@/lib/identity-vault/types";

export { buildHubBookingIdentity } from "@/lib/identity-vault/build-hub-booking-identity";
export {
  hubIdentitySlotRequirements,
  hubSupportsIdentityPrefill,
  isLegalSensitiveIdHub,
  LEGAL_SENSITIVE_ID_HUBS,
} from "@/lib/identity-vault/hub-slot-registry";
export {
  maskEmail,
  maskIdentityField,
  maskLicenseNumber,
  maskPassportNumber,
  maskPhoneE164,
} from "@/lib/identity-vault/mask-identity-field";
export {
  assertNoResidentIdInDefaultPool,
  isResidentIdLike,
} from "@/lib/identity-vault/validate-identity-pool";
export {
  DEFAULT_IDENTITY_VAULT_KINDS,
  IDENTITY_VAULT_KEYS,
  identityVaultKindForKey,
} from "@/lib/identity-vault/vault-keys";
export { upsertIdentityVaultObjectClient } from "@/lib/identity-vault/write-identity-vault-object-client";
export {
  openIdentityVaultSettings,
  subscribeIdentityVaultSettingsOpen,
  IDENTITY_VAULT_SETTINGS_OPEN_EVENT,
} from "@/lib/identity-vault/open-identity-vault-settings-bridge";
