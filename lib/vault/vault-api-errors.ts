export function isVaultMigrationMissingError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("rimvio_ensure_user_vault") ||
    lower.includes("user_vaults") ||
    lower.includes("user_vault_objects")
  );
}

export function vaultMigrationRequiredResponse() {
  return {
    persisted: false,
    vault: null,
    objects: [] as [],
    hint: "vault_migration_required" as const,
  };
}
