/**
 * Host-side API stubs — typed contracts for Context · Data · Capability.
 * Runtime implementation attaches in Platform host (future); spec: docs/RIMVIO_PLATFORM_SDK_SPEC.md
 */

import type {
  CapabilityInvokeRequest,
  CapabilityInvokeResult,
  ContextReadRequest,
  ContextReadResult,
  DataCreateRequest,
  DataSearchRequest,
} from "@/lib/platform-sdk/types";

export type PlatformDataDocument = {
  readonly id: string;
  readonly collection: string;
  readonly platformId: string;
  readonly ownerUserId: string;
  readonly document: Record<string, unknown>;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
};

/** Data API — tenant-scoped; no cross-platform reads. */
export interface RimvioPlatformDataApi {
  create(input: DataCreateRequest): Promise<PlatformDataDocument>;
  search(input: DataSearchRequest): Promise<readonly PlatformDataDocument[]>;
}

/** Context API — granted paths only. */
export interface RimvioPlatformContextApi {
  read(input: ContextReadRequest): Promise<ContextReadResult>;
}

/** Capability API — discovery index + invoke (prepare-only default). */
export interface RimvioPlatformCapabilityApi {
  invoke(input: CapabilityInvokeRequest): Promise<CapabilityInvokeResult>;
  listForPlatform(platformId: string): Promise<
    readonly {
      capabilityId: string;
      name: string;
      approvalRequired: boolean;
    }[]
  >;
}

export type RimvioPlatformHostApis = {
  readonly data: RimvioPlatformDataApi;
  readonly context: RimvioPlatformContextApi;
  readonly capabilities: RimvioPlatformCapabilityApi;
};

/** Not implemented — returns structured failure until host wires tenant DB. */
export const STUB_PLATFORM_HOST_APIS: RimvioPlatformHostApis = {
  data: {
    async create() {
      throw new Error("Rimvio Platform Data API not mounted");
    },
    async search() {
      throw new Error("Rimvio Platform Data API not mounted");
    },
  },
  context: {
    async read(input): Promise<ContextReadResult> {
      return {
        values: {},
        granted: [],
        denied: [...input.paths],
      };
    },
  },
  capabilities: {
    async invoke(input): Promise<CapabilityInvokeResult> {
      return {
        ok: false,
        capabilityId: input.capabilityId,
        platformId: input.platformId,
        errorKo: "Capability runtime not mounted",
        prepareOnly: true,
      };
    },
    async listForPlatform() {
      return [];
    },
  },
};
