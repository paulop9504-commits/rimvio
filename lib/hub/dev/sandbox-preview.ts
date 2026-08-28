import { capabilityDraftToPlatformManifest } from "@/lib/hub/capability/manifest-bridge";
import { appendDevExecutionLog } from "@/lib/hub/dev/execution-log";
import type { PlatformDraft } from "@/lib/hub/platform/types";
import {
  mountPlatformHostApis,
  readPlatformHostApis,
  registerPlatformManifest,
} from "@/lib/platform-sdk/platform-host";

export type PreviewHotelResult = {
  readonly id: string;
  readonly name: string;
  readonly rating: number;
  readonly priceKrw: number;
  readonly nights: number;
};

export type SandboxPreviewState = {
  readonly mode: "demo" | "sandbox";
  readonly platformId: string;
  readonly invokeOk: boolean;
  readonly invokeDetail: string;
  readonly hotels: readonly PreviewHotelResult[];
};

const OSAKA_DEMO_HOTELS: readonly PreviewHotelResult[] = [
  { id: "h1", name: "Swissotel Nankai Osaka", rating: 4.8, priceKrw: 462_000, nights: 2 },
  { id: "h2", name: "Hotel Monterey Grasmere", rating: 4.7, priceKrw: 284_000, nights: 2 },
];

export async function runSandboxHotelSearch(
  draft: PlatformDraft,
  input: { destination: string; checkIn: string; checkOut: string; guests: number },
): Promise<SandboxPreviewState> {
  const started = Date.now();
  const manifest = capabilityDraftToPlatformManifest(draft);
  const platformId = manifest.package.id;

  mountPlatformHostApis();
  registerPlatformManifest(manifest);

  const apis = readPlatformHostApis();
  const searchCap =
    draft.actions.find((a) => a.name === "hotel.search")?.name ?? "hotel.search";

  const result = await apis.capabilities.invoke({
    platformId,
    capabilityId: searchCap,
    input: input as unknown as Record<string, unknown>,
    approvalPolicy: "user_required",
  });

  const isOsaka =
    /osaka|오사카|난바|namba|hotel/i.test(draft.name + draft.description) ||
    draft.actions.some((a) => a.name === "hotel.search");

  const state: SandboxPreviewState = {
    mode: result.ok ? "sandbox" : "demo",
    platformId,
    invokeOk: result.ok,
    invokeDetail: result.ok
      ? `Sandbox invoke · ${searchCap} · prepareOnly`
      : result.errorKo ?? "Sandbox invoke failed — showing demo data",
    hotels: isOsaka ? OSAKA_DEMO_HOTELS : [],
  };

  appendDevExecutionLog({
    platformId,
    platformName: draft.name,
    capabilityId: searchCap,
    source: "preview",
    ok: result.ok,
    detail: state.invokeDetail,
    durationMs: Date.now() - started,
    input: input as unknown as Record<string, unknown>,
    output: result.output as Record<string, unknown> | undefined,
  });

  return state;
}
