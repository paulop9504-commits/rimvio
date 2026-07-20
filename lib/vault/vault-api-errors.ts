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
  // Soft outage — never retry-storm the boot path (console 503 × N).
  if (status === 503 || status === 429) {
    return true;
  }
  if (error && isVaultMigrationMissingError(error)) {
    return true;
  }
  return false;
}

export function vaultMigrationRequiredResponse() {
  return {
    ok: false as const,
    persisted: false,
    vault: null,
    objects: [] as [],
    error: "vault_migration_required",
    hint: "vault_migration_required" as const,
  };
}

/** HTTP status for soft vault outages (migration missing / store down). */
export const VAULT_UNAVAILABLE_HTTP_STATUS = 503;

export type VaultWriteApiBody = {
  ok?: boolean;
  error?: string;
  hint?: string;
};

/**
 * PUT /api/vault/objects may historically return 200 + `{ error, hint }`.
 * Treat that as failure so settings never toast “saved” on empty vault.
 */
export function resolveVaultWriteClientResult(
  status: number,
  body: VaultWriteApiBody,
): { ok: true } | { ok: false; error: string } {
  if (isVaultUnavailableStatus(status, body.hint, body.error)) {
    return {
      ok: false,
      error: body.error?.trim() || body.hint || "vault_unavailable",
    };
  }
  if (!status || status < 200 || status >= 300 || body.ok === false) {
    return {
      ok: false,
      error: body.error?.trim() || "vault_write_failed",
    };
  }
  if (body.error?.trim()) {
    return { ok: false, error: body.error.trim() };
  }
  return { ok: true };
}
