/**
 * Credential Vault — agent receives credentialRef only (P0/P1).
 * Raw secrets never surface in agent context or events.
 */

export type CredentialKind = "oauth_token" | "api_key" | "service_account";

export type StoredCredential = {
  readonly ref: string;
  readonly hubId: string;
  readonly kind: CredentialKind;
  readonly label: string;
  readonly createdAtIso: string;
  /** Encrypted/stored server-side in production; dev stub holds opaque token. */
  readonly secretHandle: string;
};

const STORAGE_KEY = "rimvio.federation.credential-vault.v1";
let memoryVault: StoredCredential[] = [];

function readVault(): StoredCredential[] {
  if (typeof window === "undefined") return memoryVault;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryVault;
    memoryVault = JSON.parse(raw) as StoredCredential[];
    return memoryVault;
  } catch {
    return memoryVault;
  }
}

function persistVault(creds: StoredCredential[]): void {
  memoryVault = creds;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  } catch {
    // ignore
  }
}

let seq = 0;

export function storeHubCredential(input: {
  readonly hubId: string;
  readonly kind: CredentialKind;
  readonly label: string;
  readonly secret: string;
}): StoredCredential {
  seq += 1;
  const cred: StoredCredential = {
    ref: `cred-${input.hubId}-${seq}`,
    hubId: input.hubId,
    kind: input.kind,
    label: input.label,
    createdAtIso: new Date().toISOString(),
    secretHandle: `vault://${input.hubId}/${seq}`,
  };
  persistVault([...readVault(), cred]);
  return cred;
}

export function readCredentialRef(hubId: string): string | null {
  const cred = readVault().find((c) => c.hubId === hubId);
  return cred?.ref ?? null;
}

export function resolveCredentialForExecution(ref: string): { readonly ok: true; readonly handle: string } | { readonly ok: false } {
  const cred = readVault().find((c) => c.ref === ref);
  if (!cred) return { ok: false };
  return { ok: true, handle: cred.secretHandle };
}

export function clearCredentialVaultForTests(): void {
  memoryVault = [];
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
