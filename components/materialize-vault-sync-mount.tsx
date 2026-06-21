"use client";

import { useMaterializeVaultSync } from "@/hooks/use-materialize-vault-sync";

/** Invisible mount — device index → Personal Vault sync after login. */
export function MaterializeVaultSyncMount() {
  useMaterializeVaultSync(true);
  return null;
}
