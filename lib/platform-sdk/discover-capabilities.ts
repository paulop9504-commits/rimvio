/**
 * Capability discovery for Agent planner — searches Hub Capability Index.
 */

import {
  searchCapabilityIndex,
  type CapabilitySearchHit,
} from "@/lib/platform-sdk/capability-index";
import {
  DEFAULT_USER_MARKET_CONTEXT,
  inferUserMarketFromUtterance,
  mergeUserMarketContext,
  resolveUserMarketForPlatform,
  type UserMarketContext,
} from "@/lib/platform-sdk/user-market-context";
import type { PlatformMarketContextPolicy } from "@/lib/platform-sdk/markets";
import { compileIntentFromUtterance, type RimvioIntentFrame } from "@/lib/rimvio-protocol/intent";

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
};

const MIN_SCORE = 0.35;

export function planCapabilityDiscovery(input: {
  readonly utterance: string;
  readonly userMarket?: Partial<UserMarketContext>;
  readonly contextPolicy?: PlatformMarketContextPolicy;
  readonly intentFrame?: RimvioIntentFrame | null;
}): CapabilityDiscoveryPlan | null {
  const utterance = input.utterance.trim();
  if (!utterance) return null;

  const user = mergeUserMarketContext(
    DEFAULT_USER_MARKET_CONTEXT,
    { ...inferUserMarketFromUtterance(utterance), ...input.userMarket },
  );
  const intent = input.intentFrame ?? compileIntentFromUtterance(utterance);
  const marketCountry = resolveUserMarketForPlatform(
    user,
    input.contextPolicy ?? "account_country",
  );
  const resolvedMarket =
    intent?.market && intent.market !== "GLOBAL" ? intent.market : marketCountry;

  const hits = searchCapabilityIndex(utterance, {
    limit: 1,
    publishedOnly: true,
    marketCountry: resolvedMarket === "GLOBAL" ? undefined : resolvedMarket,
  });
  const top = hits[0];
  if (!top || top.score < MIN_SCORE) return null;

  return hitToPlan(top);
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

  return searchCapabilityIndex(utterance, {
    limit: 3,
    publishedOnly: true,
    marketCountry: marketCountry === "GLOBAL" ? undefined : marketCountry,
  })
    .filter((h) => h.score >= MIN_SCORE)
    .map(hitToPlan);
}

function hitToPlan(hit: CapabilitySearchHit): CapabilityDiscoveryPlan {
  return {
    capabilityId: hit.capabilityId,
    platformId: hit.platformId,
    platformName: hit.platformName,
    marketCountry: hit.marketCountry,
    routePath: hit.routePath,
    approvalRequired: hit.approvalRequired,
    planLabelKo: `${hit.platformName} · ${hit.marketCountry} · ${hit.capabilityId}`,
    score: hit.score,
    matchReason: hit.matchReason,
  };
}
