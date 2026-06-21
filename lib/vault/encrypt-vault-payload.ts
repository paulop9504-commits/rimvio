import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const ENCRYPTION_VERSION = 1;

function deriveVaultKey(userId: string): Buffer {
  const material =
    process.env.VAULT_ENCRYPTION_KEY?.trim() ??
    (process.env.NODE_ENV === "development"
      ? "rimvio-dev-vault-key-change-me"
      : "");

  if (!material) {
    throw new Error("VAULT_ENCRYPTION_KEY is required in production.");
  }

  return createHash("sha256").update(material).update(userId.trim()).digest();
}

export function vaultEncryptionVersion(): number {
  return ENCRYPTION_VERSION;
}

/** Per-tenant envelope encryption — user_id mixed into key material. */
export function encryptVaultPayload(userId: string, payload: unknown): string {
  const key = deriveVaultKey(userId);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptVaultPayload<T = unknown>(userId: string, ciphertext: string): T {
  const key = deriveVaultKey(userId);
  const buf = Buffer.from(ciphertext, "base64url");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + 16);
  const encrypted = buf.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
  return JSON.parse(plaintext) as T;
}

export function hashVaultPlaintext(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
