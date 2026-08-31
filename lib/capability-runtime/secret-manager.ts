import type { SecretReference } from "@/lib/capability-runtime/types";

const SECRET_VALUE_RE =
  /(?:api[_-]?key|secret|password|token|authorization)\s*[=:]\s*['"]?([a-z0-9_\-]{8,})/gi;

const SK_RE = /\bsk-[a-zA-Z0-9]{8,}\b/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g;

const vault = new Map<string, string>();

export function putSecretReference(ref: SecretReference, value: string): void {
  vault.set(secretKey(ref), value);
}

export function resolveSecretForRuntime(ref: SecretReference): string | null {
  return vault.get(secretKey(ref)) ?? null;
}

export function redactSecrets(text: string): string {
  return text
    .replace(SK_RE, "sk-••••••••")
    .replace(BEARER_RE, "Bearer ••••••••")
    .replace(SECRET_VALUE_RE, (match) => match.replace(/['"]?[a-z0-9_\-]{8,}['"]?$/i, "••••••••"));
}

export function injectSecretsEphemeral(input: {
  readonly refs: readonly SecretReference[];
}): { readonly env: Readonly<Record<string, string>>; readonly dispose: () => void } {
  const env: Record<string, string> = {};
  for (const ref of input.refs) {
    const value = resolveSecretForRuntime(ref);
    if (value) env[ref.ref] = value;
  }
  return {
    env,
    dispose: () => {
      for (const key of Object.keys(env)) {
        delete env[key];
      }
    },
  };
}

function secretKey(ref: SecretReference): string {
  return `${ref.ownerProducerId}:${ref.capabilityId}:${ref.ref}`;
}

export function resetSecretVaultForTests(): void {
  vault.clear();
}
