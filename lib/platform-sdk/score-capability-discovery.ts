/**
 * Capability Discovery scoring — intent · context · reliability (not keyword search only).
 */

import type { CapabilityIndexEntry } from "@/lib/platform-sdk/capability-index";
import {
  isAgentDiscoverableCapability,
  normalizeCapabilityLifecycleStatus,
} from "@/lib/platform-sdk/capability-lifecycle";
import type { RimvioIntentFrame } from "@/lib/rimvio-protocol/intent";
import { compileIntentFromUtterance } from "@/lib/rimvio-protocol/intent";

export type DiscoveryIntentDomain =
  | "lodging"
  | "marketplace_sell"
  | "marketplace_buy"
  | "booking"
  | "payment"
  | "general";

export type CapabilityDiscoveryScoreBreakdown = {
  readonly intentMatch: number;
  readonly contextMatch: number;
  readonly reliability: number;
  readonly composite: number;
  readonly published: boolean;
  readonly intentDomain: DiscoveryIntentDomain;
  readonly capabilityDomain: DiscoveryIntentDomain;
  readonly domainAligned: boolean;
  readonly matchReason: string;
};

export type ScoredCapabilityHit = CapabilityIndexEntry & CapabilityDiscoveryScoreBreakdown;

const LODGING_RE = /호텔|hotel|숙소|lodging|숙박|객실|room/i;
const MARKET_PRODUCT_RE =
  /자전거|bike|책|book|맥북|macbook|노트북|laptop|중고|market|나눔|listing/i;
const SELL_RE = /팔|등록|sell|listing|나눔/i;
const BUY_SEARCH_RE = /사|구매|buy|찾|검색|search/i;

export const DISCOVERY_MIN_COMPOSITE = 0.55;

const WEIGHT_INTENT = 0.45;
const WEIGHT_CONTEXT = 0.3;
const WEIGHT_RELIABILITY = 0.25;

export function inferDiscoveryIntentDomain(
  utterance: string,
  intent?: RimvioIntentFrame | null,
): DiscoveryIntentDomain {
  const text = utterance.trim();
  const frame = intent ?? compileIntentFromUtterance(text);

  if (LODGING_RE.test(text)) return "lodging";
  if (/예약|book|reserve/i.test(text) && LODGING_RE.test(text)) return "booking";
  if (SELL_RE.test(text) && MARKET_PRODUCT_RE.test(text)) return "marketplace_sell";
  if (frame?.action === "sell") return "marketplace_sell";
  if (
    (frame?.action === "buy" || frame?.action === "search" || BUY_SEARCH_RE.test(text)) &&
    MARKET_PRODUCT_RE.test(text)
  ) {
    return "marketplace_buy";
  }
  if (/결제|payment|pay/i.test(text)) return "payment";
  return "general";
}

export function inferCapabilityDomain(entry: CapabilityIndexEntry): DiscoveryIntentDomain {
  const id = entry.capabilityId.toLowerCase();
  if (id.startsWith("hotel.")) return "lodging";
  if (id.startsWith("booking.")) return "booking";
  if (id.startsWith("payment.")) return "payment";
  if (id.includes("create_listing") || id.includes("sell")) return "marketplace_sell";
  if (
    id.includes("search") ||
    id.includes("purchase") ||
    id.includes("offer") ||
    entry.category === "e-commerce"
  ) {
    return "marketplace_buy";
  }
  return "general";
}

function domainAligned(
  utteranceDomain: DiscoveryIntentDomain,
  capabilityDomain: DiscoveryIntentDomain,
): boolean {
  if (utteranceDomain === "general") {
    return capabilityDomain !== "lodging" && capabilityDomain !== "booking";
  }
  if (utteranceDomain === "lodging") {
    return capabilityDomain === "lodging" || capabilityDomain === "booking";
  }
  if (utteranceDomain === "booking") {
    return capabilityDomain === "booking" || capabilityDomain === "lodging";
  }
  if (utteranceDomain === "marketplace_sell") {
    return capabilityDomain === "marketplace_sell";
  }
  if (utteranceDomain === "marketplace_buy") {
    return capabilityDomain === "marketplace_buy";
  }
  if (utteranceDomain === "payment") {
    return capabilityDomain === "payment";
  }
  return utteranceDomain === capabilityDomain;
}

function scoreIntentMatch(
  utterance: string,
  entry: CapabilityIndexEntry,
  utteranceDomain: DiscoveryIntentDomain,
  capabilityDomain: DiscoveryIntentDomain,
  aligned: boolean,
): { score: number; reason: string } {
  if (!aligned) {
    return { score: 0, reason: `domain mismatch (${utteranceDomain}≠${capabilityDomain})` };
  }

  const text = utterance.toLowerCase();
  let score = 0.55;
  let reason = "domain match";

  if (text.includes(entry.capabilityId.toLowerCase())) {
    score = 0.98;
    reason = "capability id";
  }

  for (const kw of entry.keywords) {
    if (kw.length < 2) continue;
    if (text.includes(kw)) {
      score = Math.max(score, kw.length >= 4 ? 0.88 : 0.72);
      reason = reason || `keyword:${kw}`;
    }
  }

  if (utteranceDomain === "marketplace_sell" && entry.capabilityId.includes("create_listing")) {
    score = Math.max(score, 0.94);
    reason = "sell intent";
  }
  if (utteranceDomain === "marketplace_buy" && entry.capabilityId.includes("search")) {
    score = Math.max(score, 0.9);
    reason = "buy/search intent";
  }
  if (utteranceDomain === "lodging" && entry.capabilityId.includes("hotel.search")) {
    score = Math.max(score, 0.94);
    reason = "hotel search intent";
  }
  if (utteranceDomain === "booking" && entry.capabilityId.includes("booking")) {
    score = Math.max(score, 0.91);
    reason = "booking intent";
  }

  if (text.includes(entry.platformName.toLowerCase())) {
    score = Math.min(1, score + 0.06);
    reason = reason || "platform name";
  }

  return { score: Math.min(1, score), reason };
}

function scoreContextMatch(
  utterance: string,
  entry: CapabilityIndexEntry,
  intent: RimvioIntentFrame | null,
  marketCountry?: string,
): number {
  let score = 0.75;
  const resolvedMarket = marketCountry?.toUpperCase();

  if (resolvedMarket && entry.marketCountry === resolvedMarket) {
    score = 0.95;
  } else if (intent?.market && intent.market !== "GLOBAL") {
    score = intent.market === entry.marketCountry ? 0.91 : 0.62;
  }

  if (/근처|동네|near|난바|namba|도쿄|tokyo|오사카|osaka/i.test(utterance)) {
    if (entry.capabilityId.includes("hotel") || entry.tags.includes("travel")) {
      score = Math.min(1, score + 0.04);
    }
  }

  return score;
}

function scoreReliability(entry: CapabilityIndexEntry): number {
  let score = 0.82;
  if (entry.rimvioCertified) score = 0.98;
  if (normalizeCapabilityLifecycleStatus(entry.status) === "PUBLISHED") {
    score = Math.min(1, score + 0.02);
  }
  if (entry.inputSchema && entry.outputSchema) {
    score = Math.min(1, score + 0.03);
  }
  return score;
}

export function scoreCapabilityForDiscovery(input: {
  readonly utterance: string;
  readonly entry: CapabilityIndexEntry;
  readonly intentFrame?: RimvioIntentFrame | null;
  readonly marketCountry?: string;
}): ScoredCapabilityHit | null {
  const utterance = input.utterance.trim();
  if (!utterance) return null;

  if (!isAgentDiscoverableCapability(input.entry.status)) {
    return null;
  }

  const intent = input.intentFrame ?? compileIntentFromUtterance(utterance);
  const utteranceDomain = inferDiscoveryIntentDomain(utterance, intent);
  const capabilityDomain = inferCapabilityDomain(input.entry);

  if (utteranceDomain === "general") {
    return null;
  }

  const aligned = domainAligned(utteranceDomain, capabilityDomain);
  const intentResult = scoreIntentMatch(
    utterance,
    input.entry,
    utteranceDomain,
    capabilityDomain,
    aligned,
  );

  if (intentResult.score <= 0) {
    return null;
  }

  const contextMatch = scoreContextMatch(
    utterance,
    input.entry,
    intent,
    input.marketCountry,
  );
  const reliability = scoreReliability(input.entry);
  const composite =
    intentResult.score * WEIGHT_INTENT +
    contextMatch * WEIGHT_CONTEXT +
    reliability * WEIGHT_RELIABILITY;

  return {
    ...input.entry,
    intentMatch: intentResult.score,
    contextMatch,
    reliability,
    composite,
    published: true,
    intentDomain: utteranceDomain,
    capabilityDomain,
    domainAligned: aligned,
    matchReason: intentResult.reason,
  };
}

export function rankCapabilityDiscovery(input: {
  readonly utterance: string;
  readonly entries: readonly CapabilityIndexEntry[];
  readonly intentFrame?: RimvioIntentFrame | null;
  readonly marketCountry?: string;
  readonly limit?: number;
  readonly minComposite?: number;
}): ScoredCapabilityHit[] {
  const minComposite = input.minComposite ?? DISCOVERY_MIN_COMPOSITE;
  const scored: ScoredCapabilityHit[] = [];

  for (const entry of input.entries) {
    const hit = scoreCapabilityForDiscovery({
      utterance: input.utterance,
      entry,
      intentFrame: input.intentFrame,
      marketCountry: input.marketCountry,
    });
    if (hit && hit.composite >= minComposite) {
      scored.push(hit);
    }
  }

  return scored
    .sort((a, b) => b.composite - a.composite)
    .slice(0, input.limit ?? 5);
}
