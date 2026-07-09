import { IDENTITY_VAULT_KEYS } from "@/lib/identity-vault/vault-keys";
import type {
  ContactChannelPayload,
  DriverLicensePayload,
  IdentityVaultBundle,
  PassportDocumentPayload,
  SensitiveNationalIdPayload,
  TravelerProfilePayload,
} from "@/lib/identity-vault/types";

async function readObject<T>(objectKey: string): Promise<T | null> {
  const response = await fetch(
    `/api/vault/objects?objectKey=${encodeURIComponent(objectKey)}`,
    { credentials: "same-origin" },
  );
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { payload?: T };
  return body.payload ?? null;
}

/** Client helper for booking UI — loads only when user explicitly continues to book. */
export async function readIdentityVaultBundleClient(): Promise<IdentityVaultBundle> {
  const [
    traveler,
    passport,
    driverLicense,
    contact,
    sensitiveNationalId,
  ] = await Promise.all([
    readObject<TravelerProfilePayload>(IDENTITY_VAULT_KEYS.travelerProfile),
    readObject<PassportDocumentPayload>(IDENTITY_VAULT_KEYS.passport),
    readObject<DriverLicensePayload>(IDENTITY_VAULT_KEYS.driverLicense),
    readObject<ContactChannelPayload>(IDENTITY_VAULT_KEYS.contact),
    readObject<SensitiveNationalIdPayload>(IDENTITY_VAULT_KEYS.sensitiveNationalId),
  ]);
  return {
    traveler: traveler ?? undefined,
    passport: passport ?? undefined,
    driverLicense: driverLicense ?? undefined,
    contact: contact ?? undefined,
    sensitiveNationalId: sensitiveNationalId ?? undefined,
  };
}
