/** Map vault write API errors to settings toast copy. */
export function mapVaultWriteErrorCopy(
  error: string,
  copy: {
    saveFailed: string;
    saveNeedLogin: string;
    saveVaultUnavailable: string;
  },
): string {
  const key = error.trim().toLowerCase();
  if (key === "login_required") {
    return copy.saveNeedLogin;
  }
  if (
    key === "vault_migration_required" ||
    key === "vault_unavailable" ||
    key.includes("user_vault") ||
    key.includes("rimvio_ensure_user_vault") ||
    key.includes("does not exist")
  ) {
    return copy.saveVaultUnavailable;
  }
  return copy.saveFailed;
}
