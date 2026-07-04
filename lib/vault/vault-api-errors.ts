export function isVaultMigrationMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find the function") ||
    lower.includes("schema cache") ||
    lower.includes("rimvio_ensure_user_vault") ||
    lower.includes("user_vaults") ||
    lower.includes("user_vault_objects") ||
    lower.includes("vault_provision_failed") ||
    lower.includes("vault_read_failed") ||
    lower.includes("vault_provision")
  );
}

export function isVaultUnavailableStatus(
  status: number,
  hint?: string | null,
  error?: string | null,
): boolean {
  if (hint === "vault_migration_required" || hint === "vault_unavailable") {
    return true;
  }
  if (status === 429) {
    return true;
  }
  if (status === 503 && (hint === "vault_migration_required" || hint === "vault_unavailable")) {
    return true;
  }
  if (error && isVaultMigrationMissingError(error)) {
    return true;
  }
  return false;
}

export function vaultMigrationRequiredResponse() {
  return {
    persisted: false,
    vault: null,
    objects: [] as [],
    hint: "vault_migration_required" as const,
  };
}
