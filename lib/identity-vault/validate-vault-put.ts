/**
 * Validate identity vault payloads on PUT — reject RRN in default pool.
 */

import type { VaultObjectKind } from "@/lib/vault/types";
import { assertNoResidentIdInDefaultPool } from "@/lib/identity-vault/validate-identity-pool";

const DEFAULT_POOL_KINDS: readonly VaultObjectKind[] = [
  "identity_traveler_profile",
  "identity_passport",
  "identity_driver_license",
  "identity_contact",
];

export function validateIdentityVaultPut(
  kind: VaultObjectKind,
  payload: unknown,
): void {
  if (!DEFAULT_POOL_KINDS.includes(kind)) {
    return;
  }
  assertNoResidentIdInDefaultPool(payload, kind);
}
