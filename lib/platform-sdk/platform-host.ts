/**
 * Rimvio Platform Host — mounts Data · Context · Capability APIs + manifest registry.
 */

import type { RimvioPlatformManifest } from "@/lib/platform-sdk/types";
import type { RimvioPlatformHostApis } from "@/lib/platform-sdk/host-apis";
import { createTenantDataApi } from "@/lib/platform-sdk/tenant-data-store";
import {
  readCapabilityIndex,
  type CapabilityIndexEntry,
} from "@/lib/platform-sdk/capability-index";
import { synthesizeMarketsDeclaration, createDefaultMarketDeployment } from "@/lib/platform-sdk/markets";
import type { PlatformMarketCode } from "@/lib/platform-sdk/types";

const MANIFEST_EVENT = "rimvio:platform-host-manifest";

let mountedApis: RimvioPlatformHostApis | null = null;
const manifestRegistry = new Map<string, RimvioPlatformManifest>();

export function mountPlatformHostApis(): RimvioPlatformHostApis {
  if (mountedApis) return mountedApis;

  const dataApi = createTenantDataApi();

  mountedApis = {
    data: dataApi,
    context: {
      async read(input) {
        const indexEntry = readCapabilityIndex().find(
          (e) => e.platformId === input.platformId,
        );
        void indexEntry;
        return {
          values: {},
          granted: [],
          denied: [...input.paths],
        };
      },
    },
    capabilities: {
      async invoke(input) {
        const runtimeId = input.runtimeId ?? (input.input?.runtimeId as string | undefined);
        const forceFail =
          input.input?.forceFailRuntime === true &&
          runtimeId === "rimvio.browser-runtime";

        if (forceFail) {
          return {
            ok: false,
            capabilityId: input.capabilityId,
            platformId: input.platformId,
            errorKo: "Runtime execution failed (simulated)",
            prepareOnly: true as const,
            runtimeId,
          };
        }

        const latencyMs =
          typeof input.input?.expectedLatencyMs === "number"
            ? input.input.expectedLatencyMs
            : undefined;

        return {
          ok: true,
          capabilityId: input.capabilityId,
          platformId: input.platformId,
          output: {
            prepare: true,
            runtimeId: runtimeId ?? "rimvio.cloud-runtime",
          },
          prepareOnly: true as const,
          runtimeId,
          durationMs: latencyMs,
        };
      },
      async listForPlatform(platformId) {
        return readCapabilityIndex()
          .filter((e) => e.platformId === platformId)
          .map((e) => ({
            capabilityId: e.capabilityId,
            name: e.capabilityId,
            approvalRequired: e.approvalRequired,
          }));
      },
    },
  };

  return mountedApis;
}

export function readPlatformHostApis(): RimvioPlatformHostApis {
  return mountPlatformHostApis();
}

export function registerPlatformManifest(manifest: RimvioPlatformManifest): void {
  manifestRegistry.set(manifest.package.id, manifest);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(MANIFEST_EVENT, { detail: { platformId: manifest.package.id } }),
    );
  }
}

export function readPlatformManifest(platformId: string): RimvioPlatformManifest | null {
  return manifestRegistry.get(platformId) ?? null;
}

export function resolvePlatformManifestFromIndex(
  platformId: string,
): RimvioPlatformManifest | null {
  const cached = manifestRegistry.get(platformId);
  if (cached) return cached;

  const entries = readCapabilityIndex().filter((e) => e.platformId === platformId);
  if (entries.length === 0) return null;

  const marketCountries = [
    ...new Set(entries.map((e) => e.marketCountry)),
  ] as PlatformMarketCode[];
  const primary = marketCountries[0] ?? "KR";

  const manifest: RimvioPlatformManifest = {
    specVersion: "rimvio.platform.manifest.v1",
    package: {
      id: platformId,
      name: entries[0]!.platformName,
      version: "1.0.0",
      description: entries[0]!.platformName,
      category: entries[0]!.category as RimvioPlatformManifest["package"]["category"],
      tags: [...entries[0]!.tags],
      pricing: "free",
      icon: null,
    },
    operator: {
      name: entries[0]!.platformName,
      headquartersCountry: primary === "GLOBAL" ? "KR" : primary,
    },
    markets: synthesizeMarketsDeclaration({
      primary: primary === "GLOBAL" ? "KR" : primary,
      contextPolicy: "account_country",
      deployments: marketCountries
        .filter((c) => c !== "GLOBAL")
        .map((c, i) =>
          createDefaultMarketDeployment(c as Exclude<PlatformMarketCode, "GLOBAL">, {
            primary: i === 0,
            status: "approved",
          }),
        ),
    }),
    runtime: {
      tier: "native",
      type: "cloud-agent",
      entry: "platform/index.ts",
      hostVersion: ">=1.0.0",
    },
    permissions: { required: [], optional: [], denied: [] },
    context: { read: [], write: [] },
    data: { collections: [], isolation: "tenant_strict" },
    capabilities: entries.map((e: CapabilityIndexEntry) => ({
      id: e.capabilityId,
      name: e.capabilityId,
      inputSchema: e.inputSchema,
      outputSchema: e.outputSchema,
      approvalRequired: e.approvalRequired,
    })),
    ui: {
      routes: entries.map((e) => ({
        path: e.routePath,
        surface: "page" as const,
        component: e.capabilityId.replace(/\./g, "_"),
      })),
    },
    composition: { imports: [] },
    events: { emits: [], subscribes: [] },
  };

  manifestRegistry.set(platformId, manifest);
  return manifest;
}

export function subscribePlatformManifest(
  listener: (platformId: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ platformId: string }>).detail;
    if (detail?.platformId) listener(detail.platformId);
  };
  window.addEventListener(MANIFEST_EVENT, handler);
  return () => window.removeEventListener(MANIFEST_EVENT, handler);
}

export function clearPlatformHostForTests(): void {
  mountedApis = null;
  manifestRegistry.clear();
}
