/**
 * Capability discovery for Agent planner — searches Hub Capability Index.
 * Exposure: only intent-scoped capabilities surface (not full Dev platform).
 */

import {
  searchCapabilityIndex,
} from "@/lib/platform-sdk/capability-index";
import { DISCOVERY_MIN_COMPOSITE, type ScoredCapabilityHit } from "@/lib/platform-sdk/score-capability-discovery";
import {
  DEFAULT_USER_MARKET_CONTEXT,
  inferUserMarketFromUtterance,
  mergeUserMarketContext,
  resolveUserMarketForPlatform,
  type UserMarketContext,
} from "@/lib/platform-sdk/user-market-context";
import type { PlatformMarketContextPolicy } from "@/lib/platform-sdk/markets";
import { compileIntentFromUtterance, type RimvioIntentFrame } from "@/lib/rimvio-protocol/intent";
import {
  getCachedIntent,
  getCachedRankingPlan,
} from "@/lib/platform-sdk/discovery-cache";
import {
  planCapabilityExposure,
  filterHitsForExposure,
  type CapabilityExposurePlan,
} from "@/lib/platform-sdk/capability-exposure-policy";
import { evaluateReuseGate } from "@/lib/rimvio-index/reuse-gate";

export type CapabilityDiscoveryScores = {
  readonly intentMatch: number;
  readonly contextMatch: number;
  readonly reliability: number;
  readonly composite: number;
};

export type CapabilityDiscoveryPlan = {
  readonly capabilityId: string;
  readonly platformId: string;
  readonly platformName: string;
  readonly marketCountry: string;
  readonly routePath: string;
  readonly approvalRequired: boolean;
  readonly planLabelKo: string;
  readonly score: number;
  readonly matchReason: string;
  readonly scores: CapabilityDiscoveryScores;
  readonly intentDomain: string;
  readonly discoveryCacheHit?: boolean;
  readonly exposure?: CapabilityExposurePlan;
};

export function planCapabilityDiscovery(input: {
  readonly utterance: string;
  readonly userMarket?: Partial<UserMarketContext>;
  readonly contextPolicy?: PlatformMarketContextPolicy;
  readonly intentFrame?: RimvioIntentFrame | null;
  readonly skipReuseGate?: boolean;
}): CapabilityDiscoveryPlan | null {
  const utterance = input.utterance.trim();
  if (!utterance) return null;

  if (!input.skipReuseGate) {
    const gate = evaluateReuseGate({ utterance });
    if (gate.decision === "create") {
      return null;
    }
  }

  const user = mergeUserMarketContext(
    DEFAULT_USER_MARKET_CONTEXT,
    { ...inferUserMarketFromUtterance(utterance), ...input.userMarket },
  );
  const marketCountry = resolveUserMarketForPlatform(
    user,
    input.contextPolicy ?? "account_country",
  );

  const { plan, cacheHit } = getCachedRankingPlan(utterance, marketCountry, () =>
    planCapabilityDiscoveryUncached(input, utterance, marketCountry),
  );
  if (!plan) return null;
  return cacheHit ? { ...plan, discoveryCacheHit: true } : plan;
}

function planCapabilityDiscoveryUncached(
  input: {
    readonly utterance: string;
    readonly intentFrame?: RimvioIntentFrame | null;
  },
  utterance: string,
  marketCountry: string,
): CapabilityDiscoveryPlan | null {
  const { frame: intent } =
    input.intentFrame != null
      ? { frame: input.intentFrame }
      : getCachedIntent(utterance, () =>
          compileIntentFromUtterance(utterance) ?? {
            action: "search",
            confidence: "inferred",
            sourceUtterance: utterance,
          },
        );

  const resolvedMarket =
    intent?.market && intent.market !== "GLOBAL" ? intent.market : marketCountry;

  const hits = filterHitsForExposure(
    searchCapabilityIndex(utterance, {
      limit: 8,
      publishedOnly: true,
      marketCountry: resolvedMarket === "GLOBAL" ? undefined : resolvedMarket,
    }),
  );
  const exposure = planCapabilityExposure({ utterance, hits });
  if (!exposure) return null;

  const top = hits.find((h) => h.capabilityId === exposure.primary.capabilityId) ?? hits[0];
  if (!top || top.composite < DISCOVERY_MIN_COMPOSITE) return null;

  return hitToPlan(top, exposure);
}

export function planCapabilityDiscoveryFromHits(
  utterance: string,
  opts?: { userMarket?: Partial<UserMarketContext>; contextPolicy?: PlatformMarketContextPolicy },
): readonly CapabilityDiscoveryPlan[] {
  const user = mergeUserMarketContext(DEFAULT_USER_MARKET_CONTEXT, {
    ...inferUserMarketFromUtterance(utterance),
    ...opts?.userMarket,
  });
  const marketCountry = resolveUserMarketForPlatform(
    user,
    opts?.contextPolicy ?? "account_country",
  );

  const hits = filterHitsForExposure(
    searchCapabilityIndex(utterance, {
      limit: 8,
      publishedOnly: true,
      marketCountry: marketCountry === "GLOBAL" ? undefined : marketCountry,
    }),
  );
  const exposure = planCapabilityExposure({ utterance, hits });
  if (!exposure) return [];

  return hits
    .filter((h) => exposure.pipeline.some((p) => p.capabilityId === h.capabilityId))
    .filter((h) => h.composite >= DISCOVERY_MIN_COMPOSITE)
    .map((h) => hitToPlan(h, exposure));
}

function hitToPlan(
  hit: ScoredCapabilityHit,
  exposure: CapabilityExposurePlan,
): CapabilityDiscoveryPlan {
  return {
    capabilityId: hit.capabilityId,
    platformId: hit.platformId,
    platformName: hit.platformName,
    marketCountry: hit.marketCountry,
    routePath: hit.routePath,
    approvalRequired: hit.approvalRequired,
    planLabelKo: exposure.experienceLabelKo,
    score: hit.composite,
    matchReason: hit.matchReason,
    scores: {
      intentMatch: hit.intentMatch,
      contextMatch: hit.contextMatch,
      reliability: hit.reliability,
      composite: hit.composite,
    },
    intentDomain: hit.intentDomain,
    exposure,
  };
}

