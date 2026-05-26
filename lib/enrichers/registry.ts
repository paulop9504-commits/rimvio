import { normalizeEnricherContext } from "@/lib/enrichers/context";
import { commerceEnricher, isCommerceDomain } from "@/lib/enrichers/commerce";
import { genericEnricher } from "@/lib/enrichers/generic";
import { githubEnricher, isGitHubDomain } from "@/lib/enrichers/github";
import { isKakaoOpenChatUrl, kakaoEnricher } from "@/lib/enrichers/kakao";
import { mapEnricher, isMapUrl } from "@/lib/enrichers/map";
import { isTransportUrl, transportEnricher } from "@/lib/enrichers/transport";
import { isYouTubeDomain, youtubeEnricher } from "@/lib/enrichers/youtube";
import { rankActionsByIntent } from "@/lib/intent/rank-actions";
import { fetchBinStats } from "@/lib/intent/store";
import { resolveActions } from "@/lib/resolvers";
import type {
  EnrichedLink,
  Enricher,
  EnricherContext,
} from "@/lib/enrichers/types";
import { tryCreateClient } from "@/lib/supabase/server";

const DOMAIN_ENRICHERS: Enricher[] = [
  youtubeEnricher,
  githubEnricher,
  mapEnricher,
  transportEnricher,
  kakaoEnricher,
  commerceEnricher,
];

const PIN_TOP_ENRICHERS = new Set([
  youtubeEnricher.id,
  githubEnricher.id,
  mapEnricher.id,
  transportEnricher.id,
  kakaoEnricher.id,
  commerceEnricher.id,
]);

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function matchesEnricher(enricher: Enricher, domain: string, rawUrl: string) {
  if (enricher.id === youtubeEnricher.id) {
    return isYouTubeDomain(domain);
  }

  if (enricher.id === githubEnricher.id) {
    return isGitHubDomain(domain);
  }

  if (enricher.id === mapEnricher.id) {
    return isMapUrl(rawUrl);
  }

  if (enricher.id === transportEnricher.id) {
    return isTransportUrl(rawUrl);
  }

  if (enricher.id === kakaoEnricher.id) {
    return isKakaoOpenChatUrl(rawUrl);
  }

  if (enricher.id === commerceEnricher.id) {
    return isCommerceDomain(domain);
  }

  return enricher.domains?.some(
    (candidate) => normalizeDomain(candidate) === normalizeDomain(domain)
  );
}

export function resolveEnricher(
  domain: string,
  rawUrl: string,
  _context?: EnricherContext
): Enricher {
  for (const enricher of DOMAIN_ENRICHERS) {
    if (matchesEnricher(enricher, domain, rawUrl)) {
      return enricher;
    }
  }

  return genericEnricher;
}

async function applyIntentRank(
  enriched: EnrichedLink,
  context: EnricherContext
): Promise<EnrichedLink> {
  const supabase = await tryCreateClient();
  const stats = supabase ? await fetchBinStats(supabase, context) : [];

  const actions = rankActionsByIntent(
    enriched.actions,
    context,
    stats,
    enriched.url,
    { pinTopAction: PIN_TOP_ENRICHERS.has(enriched.enricher_id) }
  );

  return { ...enriched, actions };
}

async function finalizeEnriched(
  enriched: EnrichedLink,
  context: EnricherContext
): Promise<EnrichedLink> {
  const resolved: EnrichedLink = {
    ...enriched,
    actions: resolveActions(enriched.actions, context, enriched.url),
  };

  return applyIntentRank(resolved, context);
}

export async function enrichUrl(
  rawUrl: string,
  context?: Partial<EnricherContext> | null
): Promise<EnrichedLink> {
  const normalizedContext = normalizeEnricherContext(context);
  let domain = "link";
  let parsedUrl = rawUrl;

  try {
    const parsed = new URL(
      /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    );
    domain = parsed.hostname;
    parsedUrl = parsed.href;
  } catch {
    const enriched = await genericEnricher.enrich(rawUrl, normalizedContext);
    return finalizeEnriched(enriched, normalizedContext);
  }

  const enricher = resolveEnricher(domain, parsedUrl, normalizedContext);
  const enriched = await enricher.enrich(parsedUrl, normalizedContext);
  return finalizeEnriched(enriched, normalizedContext);
}

export {
  genericEnricher,
  youtubeEnricher,
  githubEnricher,
  mapEnricher,
  transportEnricher,
  kakaoEnricher,
  commerceEnricher,
};
