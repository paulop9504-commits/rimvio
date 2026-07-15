import type {
  FastScanCandidate,
  RankedCandidate,
  RankingAxisScores,
} from "@/engines/research/schema";
import type { IntentBlueprint } from "@/lib/intent-engine/types";

const SPAM_RE =
  /(?:클릭|천만원\s*이벤트|무료\s*아이폰|100%\s*당첨|지금\s*클릭)/iu;
const CLICKBAIT_RE = /(?:충격|대박|절대\s*모름|헐\s*대박)/iu;

function freshnessScore(iso: string | null | undefined): number {
  if (!iso) {
    return 0.45;
  }
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return 0.45;
  }
  const ageDays = (Date.now() - t) / (86400 * 1000);
  if (ageDays < 30) {
    return 1;
  }
  if (ageDays < 180) {
    return 0.75;
  }
  if (ageDays < 365) {
    return 0.5;
  }
  return 0.25;
}

function authorityScore(domain: string, mediaType: FastScanCandidate["mediaType"]): number {
  const d = domain.toLowerCase();
  let score = 0.4;
  if (mediaType === "official") {
    score += 0.35;
  }
  if (mediaType === "review" || mediaType === "listing") {
    score += 0.15;
  }
  if (
    /(?:gov|go\.kr|ac\.jp|edu|tripadvisor|google\.com|booking|agoda|yanolja|airbnb)/iu.test(
      d,
    )
  ) {
    score += 0.25;
  }
  if (/inventory\.rimvio|discovery\..+\.rimvio/iu.test(d)) {
    score += 0.22;
  }
  return Math.min(1, score);
}

function userContextScore(
  candidate: FastScanCandidate,
  blueprint: IntentBlueprint | null,
): number {
  if (!blueprint) {
    return 0.5;
  }
  const blob = `${candidate.title} ${candidate.snippet}`.toLowerCase();
  let hits = 0;
  let n = 0;
  for (const mood of blueprint.mood) {
    if (mood === "UNKNOWN") {
      continue;
    }
    n += 1;
    if (blob.includes(mood.toLowerCase()) || blob.includes("로맨") && mood === "Romantic") {
      hits += 1;
    }
  }
  for (const style of blueprint.style) {
    if (style === "UNKNOWN") {
      continue;
    }
    n += 1;
    if (blob.includes(style.replace(/_/g, " "))) {
      hits += 1;
    }
  }
  if (n === 0) {
    return 0.5;
  }
  return Math.min(1, 0.35 + (hits / n) * 0.65);
}

function scoreAxes(
  candidate: FastScanCandidate,
  blueprint: IntentBlueprint | null,
  domainSeen: Map<string, number>,
): RankingAxisScores {
  const relevance = candidate.relevanceScore ?? 0.4;
  const freshness = freshnessScore(candidate.publishDateIso);
  const authority = authorityScore(candidate.domain, candidate.mediaType);
  const popularity = candidate.popularity ?? 0.4;
  const trust = Math.min(
    1,
    authority * 0.6 +
      (candidate.reviewCount != null && candidate.reviewCount > 5 ? 0.3 : 0.15) +
      0.1,
  );
  const domainCount = domainSeen.get(candidate.domain) ?? 0;
  const diversity = domainCount <= 1 ? 1 : Math.max(0.2, 1 - domainCount * 0.25);
  const userContext = userContextScore(candidate, blueprint);
  return {
    relevance,
    freshness,
    authority,
    popularity,
    trust,
    diversity,
    userContext,
  };
}

function totalFromAxes(axes: RankingAxisScores): number {
  return (
    axes.relevance * 0.28 +
    axes.freshness * 0.1 +
    axes.authority * 0.16 +
    axes.popularity * 0.1 +
    axes.trust * 0.16 +
    axes.diversity * 0.08 +
    axes.userContext * 0.12
  );
}

/** Stage 5 — multi-axis rank; reject spam/dupes/clickbait. */
export function rankResearchCandidates(input: {
  candidates: readonly FastScanCandidate[];
  blueprint: IntentBlueprint | null;
}): RankedCandidate[] {
  const seenTitles = new Set<string>();
  const domainSeen = new Map<string, number>();
  const out: RankedCandidate[] = [];

  const sorted = [...input.candidates].sort(
    (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
  );

  for (const candidate of sorted) {
    const titleKey = candidate.title.trim().toLowerCase();
    domainSeen.set(
      candidate.domain,
      (domainSeen.get(candidate.domain) ?? 0) + 1,
    );

    if (seenTitles.has(titleKey)) {
      out.push({
        candidate,
        axes: scoreAxes(candidate, input.blueprint, domainSeen),
        totalScore: 0,
        rejected: true,
        rejectReason: "duplicate",
      });
      continue;
    }
    seenTitles.add(titleKey);

    const blob = `${candidate.title} ${candidate.snippet}`;
    if (SPAM_RE.test(blob)) {
      out.push({
        candidate,
        axes: scoreAxes(candidate, input.blueprint, domainSeen),
        totalScore: 0,
        rejected: true,
        rejectReason: "spam",
      });
      continue;
    }

    const axes = scoreAxes(candidate, input.blueprint, domainSeen);
    let total = totalFromAxes(axes);
    if (CLICKBAIT_RE.test(blob)) {
      total *= 0.55;
    }
    out.push({
      candidate,
      axes,
      totalScore: total,
      rejected: false,
      rejectReason: null,
    });
  }

  return out.sort((a, b) => {
    if (a.rejected !== b.rejected) {
      return a.rejected ? 1 : -1;
    }
    return b.totalScore - a.totalScore;
  });
}
