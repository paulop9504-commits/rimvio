import { createHash, createHmac } from "node:crypto";
import type { SignedCapabilityArtifact } from "@/lib/capability-runtime/types";

function signingKey(): string {
  return (
    process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    "rimvio-capability-artifact-dev"
  );
}

export function signCapabilityArtifact(input: {
  readonly capabilityId: string;
  readonly bytes: string;
  readonly sourceRepo?: string;
}): SignedCapabilityArtifact {
  const digestSha256 = createHash("sha256").update(input.bytes).digest("hex");
  const signature = createHmac("sha256", signingKey()).update(digestSha256).digest("hex");
  return {
    artifactId: `art-${digestSha256.slice(0, 12)}`,
    capabilityId: input.capabilityId,
    digestSha256,
    signature,
    builtAtIso: new Date().toISOString(),
    sourceRepo: input.sourceRepo,
  };
}

export function verifySignedArtifact(artifact: SignedCapabilityArtifact): boolean {
  const expected = createHmac("sha256", signingKey()).update(artifact.digestSha256).digest("hex");
  return expected === artifact.signature;
}
