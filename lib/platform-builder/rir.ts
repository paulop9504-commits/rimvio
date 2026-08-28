/**
 * Rimvio Intermediate Representation (RIR) — SSOT between AI and Platform compiler.
 * docs/RIMVIO_BUILDER_SPEC.md · ADR-055
 */

import type {
  PlatformMarketsDeclaration,
  PlatformOperatorDeclaration,
  PlatformMarketCode,
} from "@/lib/platform-sdk/types";
import { createDefaultMarketsDeclaration } from "@/lib/platform-sdk/markets";

export const RIMVIO_BUILDER_RIR_VERSION = "rimvio.builder.rir.v1" as const;

export type BuilderRirKind = "platform" | "capability";

export type BuilderClarification = {
  readonly question: string;
  readonly answer: string | null;
  readonly options?: readonly string[];
};

export type BuilderRole = {
  readonly id: string;
  readonly label: string;
};

export type BuilderObject = {
  readonly id: string;
  readonly label: string;
  readonly collection: string;
  readonly fields: readonly string[];
};

export type BuilderAction = {
  readonly id: string;
  readonly label: string;
  readonly capabilityId: string;
  readonly approvalRequired?: boolean;
  readonly markets?: readonly PlatformMarketCode[];
};

export type BuilderPage = {
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly component: string;
};

export type PlatformRir = {
  readonly specVersion: typeof RIMVIO_BUILDER_RIR_VERSION;
  readonly kind: "platform";
  readonly source: {
    readonly utterance: string;
    readonly locale: string;
  };
  readonly product: {
    readonly name: string;
    readonly slug: string;
    readonly summary: string;
    readonly category:
      | "e-commerce"
      | "productivity"
      | "finance"
      | "communication"
      | "travel"
      | "media"
      | "other";
  };
  readonly operator: PlatformOperatorDeclaration;
  readonly markets: PlatformMarketsDeclaration;
  readonly roles: readonly BuilderRole[];
  readonly objects: readonly BuilderObject[];
  readonly actions: readonly BuilderAction[];
  readonly pages: readonly BuilderPage[];
  readonly features: readonly string[];
  readonly permissions: {
    readonly required: readonly string[];
    readonly optional: readonly string[];
    readonly denied: readonly string[];
  };
  readonly context: {
    readonly read: readonly string[];
  };
  readonly clarifications: readonly BuilderClarification[];
  readonly updatedAtIso: string;
};

export type CapabilityRir = {
  readonly specVersion: typeof RIMVIO_BUILDER_RIR_VERSION;
  readonly kind: "capability";
  readonly source: {
    readonly utterance: string;
    readonly locale: string;
  };
  readonly capability: {
    readonly name: string;
    readonly id: string;
    readonly description: string;
    readonly input: readonly string[];
    readonly output: readonly string[];
    readonly requires: readonly string[];
    readonly action: string;
  };
  readonly hostPlatformId: string | null;
  readonly updatedAtIso: string;
};

export type RimvioBuilderRir = PlatformRir | CapabilityRir;

export type BuilderPhase =
  | "describe"
  | "clarify"
  | "blueprint"
  | "generate"
  | "preview"
  | "test"
  | "publish";

export type BuilderViewMode = "visual" | "logic" | "data" | "code";

export type BuilderChangeLogEntry = {
  readonly id: string;
  readonly atIso: string;
  readonly userMessage: string;
  readonly summaryKo: string;
  readonly patchIds: readonly string[];
};

export type BuilderSession = {
  readonly id: string;
  readonly phase: BuilderPhase;
  readonly viewMode: BuilderViewMode;
  readonly rir: RimvioBuilderRir | null;
  readonly pendingClarification: BuilderClarification | null;
  readonly changeLog: readonly BuilderChangeLogEntry[];
  readonly lastPreviewAtIso: string | null;
  readonly testPassed: boolean;
};

export type PlannerResult =
  | { readonly type: "clarify"; readonly question: string; readonly options: readonly string[] }
  | { readonly type: "blueprint"; readonly rir: PlatformRir; readonly summaryKo: string }
  | { readonly type: "capability"; readonly rir: CapabilityRir; readonly summaryKo: string }
  | { readonly type: "patch"; readonly rir: PlatformRir; readonly summaryKo: string };

export function isPlatformRir(rir: RimvioBuilderRir): rir is PlatformRir {
  return rir.kind === "platform";
}
