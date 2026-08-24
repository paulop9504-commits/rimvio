import { createHash, randomBytes } from "node:crypto";

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generatePairingCode(): string {
  const n = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function generateDesktopNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function generateExchangeCode(): string {
  return randomBytes(24).toString("base64url");
}
