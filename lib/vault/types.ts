export type UserVaultStatus = "active" | "locked" | "purged";

export type UserVaultRow = {
  user_id: string;
  status: UserVaultStatus;
  storage_quota_bytes: number;
  storage_used_bytes: number;
  crypto_scheme: string;
  created_at: string;
  updated_at: string;
};

export type VaultObjectKind =
  | "life_event"
  | "capture"
  | "media_blob"
  | "preferences"
  | "sync_cursor"
  | "identity_traveler_profile"
  | "identity_passport"
  | "identity_driver_license"
  | "identity_contact"
  | "identity_sensitive_national_id"
  | "payment_preference";

export type UserVaultObjectRow = {
  id: string;
  user_id: string;
  object_key: string;
  kind: VaultObjectKind;
  storage_bucket: string;
  storage_path: string | null;
  ciphertext_inline: string | null;
  content_type: string | null;
  byte_size: number;
  content_hash: string | null;
  encryption_version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type VaultObjectSummary = {
  id: string;
  objectKey: string;
  kind: VaultObjectKind;
  byteSize: number;
  contentHash: string | null;
  updatedAt: string;
  hasInlineCiphertext: boolean;
  hasStoragePath: boolean;
};

export type UpsertVaultObjectInput = {
  objectKey: string;
  kind: VaultObjectKind;
  payload: unknown;
  contentType?: string | null;
  metadata?: Record<string, unknown>;
  /** Set when client uploaded raw media to personal-vault bucket. */
  storagePath?: string | null;
  /** Total bytes (inline ciphertext or stored blob). */
  byteSize?: number;
};

export const PERSONAL_VAULT_BUCKET = "personal-vault";
