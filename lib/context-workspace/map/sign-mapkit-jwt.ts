/**
 * Apple MapKit JS JWT (ES256) — server only.
 * Spec: iss=Team ID, kid=Key ID, alg=ES256, exp ≤ 1h typical.
 */

import { createPrivateKey, sign } from "node:crypto";

function base64Url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signAppleMapKitJwt(input: {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
  /** Default 30 minutes. */
  expiresInSec?: number;
  nowSec?: number;
}): string {
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const exp = now + (input.expiresInSec ?? 30 * 60);
  const header = {
    alg: "ES256",
    typ: "JWT",
    kid: input.keyId.trim(),
  };
  const payload = {
    iss: input.teamId.trim(),
    iat: now,
    exp,
  };
  const encoded =
    `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = createPrivateKey(input.privateKeyPem);
  const signature = sign("SHA256", Buffer.from(encoded, "utf8"), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${encoded}.${base64Url(signature)}`;
}
