/**
 * Dev Hub Test Invoke — isolated policy gate + Platform Host invoke + execution log.
 * No fake success: host/policy failure is returned as-is.
 */

import { invokeCapabilityIsolated } from "@/lib/capability-runtime/invoke";
import type { CapabilityContract } from "@/lib/capability-runtime/types";
import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import type { CapabilityAction } from "@/lib/hub/capability/types";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  mountPlatformHostApis,
  readPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";
import { appendDevExecutionLog } from "@/lib/hub/dev/execution-log";
import { runSandboxHotelSearch } from "@/lib/hub/dev/sandbox-preview";
import { buildDevInvokeSampleInput } from "@/lib/hub/dev/dev-schema-preview";

export type DevCapabilityInvokeRecord = {
  readonly ok: boolean;
  readonly capabilityId: string;
  readonly latencyMs: number;
  readonly input: Readonly<Record<string, unknown>>;
  readonly output: Readonly<Record<string, unknown>> | null;
  readonly errorKo?: string;
  readonly logs: readonly string[];
};

export function validateDevInvokeInput(
  raw: string,
): { readonly ok: true; readonly value: Record<string, unknown> } | { readonly ok: false; readonly errorKo: string } {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, errorKo: "Input은 JSON object여야 해요." };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, errorKo: "JSON을 해석하지 못했어요. 형식을 확인하세요." };
  }
}

function contractForAction(draft: PlatformDraft, action: CapabilityAction): CapabilityContract {
  return {
    capabilityId: action.name,
    version: draft.version || "0.1.0",
    inputSchemaId: action.inputSchema,
    outputSchemaId: action.outputSchema,
    permissionLevel: action.approvalRequired ? 3 : 1,
    trust: "VERIFIED",
    deployModel: "rimvio_hosted",
    secretRefs: [],
    sourceVisible: false,
  };
}

export async function invokeDevCapability(input: {
  readonly draft: PlatformDraft;
  readonly action: CapabilityAction;
  readonly rawInput: string;
}): Promise<DevCapabilityInvokeRecord> {
  const parsed = validateDevInvokeInput(input.rawInput);
  if (!parsed.ok) {
    return {
      ok: false,
      capabilityId: input.action.name,
      latencyMs: 0,
      input: {},
      output: null,
      errorKo: parsed.errorKo,
      logs: [parsed.errorKo],
    };
  }

  const started = Date.now();
  const isolated = invokeCapabilityIsolated({
    request: {
      capabilityId: input.action.name,
      agentId: "hub-dev-operator",
      input: parsed.value,
    },
    contract: contractForAction(input.draft, input.action),
    handler: (payload) => ({ prepared: true, echo: payload }),
  });

  if (!isolated.ok) {
    appendDevExecutionLog({
      platformId: input.draft.id,
      platformName: input.draft.name,
      capabilityId: input.action.name,
      source: "test-invoke",
      ok: false,
      detail: isolated.errorKo ?? "Policy gateway rejected invoke",
      durationMs: Date.now() - started,
      input: parsed.value,
    });
    return {
      ok: false,
      capabilityId: input.action.name,
      latencyMs: Date.now() - started,
      input: parsed.value,
      output: null,
      errorKo: isolated.errorKo,
      logs: isolated.logs.lines,
    };
  }

  const isSearch =
    input.action.name.includes("hotel.search") || input.action.name.endsWith(".search");

  if (isSearch) {
    const preview = await runSandboxHotelSearch(input.draft, {
      destination: String(parsed.value.destination ?? "Namba Station"),
      checkIn: String(parsed.value.checkIn ?? "2026-06-15"),
      checkOut: String(parsed.value.checkOut ?? "2026-06-17"),
      guests: Number(parsed.value.guests ?? 2),
    });
    const output = {
      mode: preview.mode,
      invokeOk: preview.invokeOk,
      detail: preview.invokeDetail,
      hotels: preview.hotels,
    };
    appendDevExecutionLog({
      platformId: preview.platformId,
      platformName: input.draft.name,
      capabilityId: input.action.name,
      source: "test-invoke",
      ok: preview.invokeOk,
      detail: preview.invokeDetail,
      durationMs: Date.now() - started,
      input: parsed.value,
      output,
    });
    return {
      ok: preview.invokeOk,
      capabilityId: input.action.name,
      latencyMs: Date.now() - started,
      input: parsed.value,
      output,
      errorKo: preview.invokeOk ? undefined : preview.invokeDetail,
      logs: isolated.logs.lines,
    };
  }

  const manifest = capabilityDraftToPlatformManifest(input.draft);
  mountPlatformHostApis();
  registerPlatformManifest(manifest);
  const host = await readPlatformHostApis().capabilities.invoke({
    platformId: manifest.package.id,
    capabilityId: input.action.name,
    input: parsed.value,
    approvalPolicy: input.action.approvalRequired ? "user_required" : "none",
  });

  const output = host.ok
    ? {
        ...(host.output ?? {}),
        prepareOnly: host.prepareOnly,
        isolated: isolated.output,
      }
    : null;

  appendDevExecutionLog({
    platformId: manifest.package.id,
    platformName: input.draft.name,
    capabilityId: input.action.name,
    source: "test-invoke",
    ok: host.ok,
    detail: host.ok
      ? `Test invoke · ${input.action.name}`
      : host.errorKo ?? "Capability invoke failed",
    durationMs: Date.now() - started,
    input: parsed.value,
    output: output ?? undefined,
  });

  return {
    ok: host.ok,
    capabilityId: input.action.name,
    latencyMs: Date.now() - started,
    input: parsed.value,
    output,
    errorKo: host.ok ? undefined : host.errorKo,
    logs: isolated.logs.lines,
  };
}

export function defaultInvokeInputJson(
  action: CapabilityAction,
  context?: { destination?: string; checkIn?: string; checkOut?: string; guests?: number },
): string {
  return JSON.stringify(buildDevInvokeSampleInput(action, context), null, 2);
}
