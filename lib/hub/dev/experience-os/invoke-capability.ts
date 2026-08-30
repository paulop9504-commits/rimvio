/**
 * Real capability invoke — Platform Host, prepare-only. No fake Success.
 */

import type { PlatformDraft } from "@/lib/hub/platform/types";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import {
  mountPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";

export type CapabilityInvokeRecord = {
  readonly ok: boolean;
  readonly capabilityId: string;
  readonly platformId: string;
  readonly prepareOnly: boolean;
  readonly output?: unknown;
  readonly errorKo?: string;
  readonly durationMs?: number;
  readonly atIso: string;
};

export async function invokePlatformCapability(input: {
  readonly draft: PlatformDraft;
  readonly capabilityId: string;
  readonly input: Record<string, unknown>;
}): Promise<CapabilityInvokeRecord> {
  const started = Date.now();
  const action = input.draft.actions.find(
    (a) => a.name === input.capabilityId || a.id === input.capabilityId,
  );
  if (!action) {
    return {
      ok: false,
      capabilityId: input.capabilityId,
      platformId: input.draft.id,
      prepareOnly: true,
      errorKo: `Capability not found: ${input.capabilityId}`,
      atIso: new Date().toISOString(),
    };
  }

  const rawSchema = action.inputSchema || "{}";
  if (rawSchema.startsWith("{") || rawSchema.startsWith("[")) {
    try {
      JSON.parse(rawSchema);
    } catch {
      return {
        ok: false,
        capabilityId: action.name,
        platformId: input.draft.id,
        prepareOnly: true,
        errorKo: "Input schema JSON이 올바르지 않습니다.",
        atIso: new Date().toISOString(),
      };
    }
  }

  const manifest = capabilityDraftToPlatformManifest(input.draft);
  mountPlatformHostApis();
  registerPlatformManifest(manifest);
  const apis = mountPlatformHostApis();

  const result = await apis.capabilities.invoke({
    platformId: manifest.package.id,
    capabilityId: action.name,
    input: input.input,
    approvalPolicy: action.approvalRequired ? "user_required" : "none",
  });

  return {
    ok: result.ok,
    capabilityId: action.name,
    platformId: result.platformId,
    prepareOnly: result.prepareOnly ?? true,
    output: result.output,
    errorKo: result.errorKo,
    durationMs: result.durationMs ?? Date.now() - started,
    atIso: new Date().toISOString(),
  };
}
