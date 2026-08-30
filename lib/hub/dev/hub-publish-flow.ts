/**
 * P7 — Publish request flow: capability index v2 gate + approved execution.
 */

import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import { validateRimvioPlatformManifest } from "@/lib/platform-sdk/manifest";
import {
  evaluateCapabilityIndexPublish,
  registerCapabilityIndexFromManifestWithValidation,
  type CapabilityIndexPublishResult,
} from "@/lib/platform-sdk/capability-index";
import {
  defaultPublishOptions,
  filterManifestCapabilities,
  resolveIndexStatusFromPublishOptions,
  type HubPublishOptions,
} from "@/lib/hub/dev/hub-publish-model";
import {
  mountPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";
import { recordCapabilityVersionPublish } from "@/lib/capability-ledger/record-capability-version-publish";
import { bridgeWorkspaceToPublishedPlatform } from "@/lib/context-workspace/workspace-lifecycle";
import { hubContextEventId } from "@/lib/hub/dev/hub-agent-runtime-ingress";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import type { CapabilityAction } from "@/lib/hub/capability/types";

export type PublishGateResult = {
  readonly ok: boolean;
  readonly manifestValid: boolean;
  readonly testsPassed: boolean;
  readonly registeredCount: number;
  readonly rejected: readonly { readonly capabilityId: string; readonly errorKo: string }[];
  readonly platformId: string;
  readonly platformName: string;
  readonly errorKo?: string;
};

export type PublishExecutionResult = PublishGateResult & {
  readonly published: boolean;
  readonly indexStatus: string;
};

function buildManifest(
  draft: PlatformDraft,
  options?: HubPublishOptions,
): ReturnType<typeof capabilityDraftToPlatformManifest> {
  const full = capabilityDraftToPlatformManifest(draft);
  if (!options) return full;
  return filterManifestCapabilities(full, draft.actions as CapabilityAction[], options.capabilityIds);
}

/** Dry-run capability index v2 schema gate — no side effects until approved. */
export function evaluatePublishGate(input: {
  readonly draft: PlatformDraft;
  readonly testsPassed: boolean;
  readonly options?: HubPublishOptions;
}): PublishGateResult {
  const manifest = buildManifest(input.draft, input.options);
  const validation = validateRimvioPlatformManifest(manifest);
  if (!validation.valid) {
    return {
      ok: false,
      manifestValid: false,
      testsPassed: input.testsPassed,
      registeredCount: 0,
      rejected: [],
      platformId: manifest.package.id,
      platformName: manifest.package.name,
      errorKo: validation.errors[0] ?? "Manifest validation failed",
    };
  }

  if (!input.testsPassed) {
    return {
      ok: false,
      manifestValid: true,
      testsPassed: false,
      registeredCount: 0,
      rejected: [],
      platformId: manifest.package.id,
      platformName: manifest.package.name,
      errorKo: "Sandbox 테스트 통과 후 Publish할 수 있습니다",
    };
  }

  const indexStatus = input.options
    ? resolveIndexStatusFromPublishOptions(input.options)
    : "PUBLISHED";
  const gate = dryRunIndexGate(manifest, indexStatus, input.draft);

  return {
    ok: gate.registered.length > 0 && gate.rejected.length === 0,
    manifestValid: true,
    testsPassed: true,
    registeredCount: gate.registered.length,
    rejected: gate.rejected,
    platformId: manifest.package.id,
    platformName: manifest.package.name,
    errorKo:
      gate.rejected.length > 0
        ? gate.rejected.map((r) => `${r.capabilityId}: ${r.errorKo}`).join(" · ")
        : gate.registered.length === 0
          ? "등록할 capability가 없습니다"
          : undefined,
  };
}

function dryRunIndexGate(
  manifest: ReturnType<typeof capabilityDraftToPlatformManifest>,
  indexStatus: ReturnType<typeof resolveIndexStatusFromPublishOptions>,
  draft: PlatformDraft,
): CapabilityIndexPublishResult {
  const ownerCreatorId = draft.operator?.name ?? draft.name;
  return evaluateCapabilityIndexPublish(manifest, indexStatus, {
    ownerCreatorId,
    origin: "platform-bundled",
    rimvioCertified: draft.securityScanPassed ?? false,
    capabilityFilter: manifest.capabilities.map((c) => c.id),
  });
}

/** Execute publish after user approval — registers manifest + capability index. */
export function executeApprovedPublish(input: {
  readonly draft: PlatformDraft;
  readonly testsPassed: boolean;
  readonly options?: HubPublishOptions;
}): PublishExecutionResult {
  const gate = evaluatePublishGate(input);
  if (!gate.ok) {
    return { ...gate, published: false, indexStatus: "idle" };
  }

  const manifest = buildManifest(input.draft, input.options);
  const indexStatus = input.options
    ? resolveIndexStatusFromPublishOptions(input.options)
    : "PUBLISHED";
  const ownerCreatorId = input.draft.operator?.name ?? input.draft.name;

  mountPlatformHostApis();
  registerPlatformManifest(manifest);
  const result = registerCapabilityIndexFromManifestWithValidation(manifest, indexStatus, {
    ownerCreatorId,
    origin: "platform-bundled",
    rimvioCertified: input.testsPassed,
    capabilityFilter: manifest.capabilities.map((c) => c.id),
  });

  for (const entry of result.registered) {
    recordCapabilityVersionPublish({
      entry,
      contributorId: ownerCreatorId,
    });
  }

  bridgeWorkspaceToPublishedPlatform({
    contextEventId: hubContextEventId(manifest.package.id),
    platformId: manifest.package.id,
  });

  return {
    ...gate,
    registeredCount: result.registered.length,
    rejected: result.rejected,
    ok: result.registered.length > 0,
    published: result.registered.length > 0,
    indexStatus,
  };
}

export function defaultPublishOptionsForDraft(draft: PlatformDraft): HubPublishOptions {
  return defaultPublishOptions(draft.actions as CapabilityAction[]);
}
