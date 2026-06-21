export {
  encryptVaultPayload,
  decryptVaultPayload,
  hashVaultPlaintext,
  vaultEncryptionVersion,
} from "@/lib/vault/encrypt-vault-payload";
export {
  ensureUserVault,
  getUserVault,
  listVaultObjects,
  getVaultObjectByKey,
  readVaultObjectPayload,
  upsertVaultObjectInline,
  buildPersonalVaultStoragePath,
  createPersonalVaultUploadUrl,
} from "@/lib/vault/vault-server-store";
export type {
  UserVaultRow,
  UserVaultStatus,
  UserVaultObjectRow,
  VaultObjectKind,
  VaultObjectSummary,
  UpsertVaultObjectInput,
} from "@/lib/vault/types";
export {
  lifeEventVaultKey,
  captureVaultKey,
  mediaBlobVaultKey,
  vaultSyncCursorKey,
} from "@/lib/vault/vault-object-keys";
