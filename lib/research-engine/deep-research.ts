import type {
  DeepResearchExtract,
  RankedCandidate,
} from "@/engines/research/schema";

const PRICE_RE = /(?:₩|원|KRW|\$|¥|€)\s*[\d,.]+|[\d,.]+\s*(?:만원|천원|원)/iu;
const WARNING_RE = /(?:주의|위험|사기|취소\s*불가|환불\s*불가|공사|폐쇄)/iu;

/**
 * Stage 6 — deep-read top candidates from snippet/metadata only (no invent).
 */
export function deepResearchTopCandidates(
  ranked: readonly RankedCandidate[],
  topK = 5,
): DeepResearchExtract[] {
  const kept = ranked.filter((r) => !r.rejected).slice(0, topK);
  return kept.map((row) => {
    const c = row.candidate;
    const snippet = c.snippet.trim();
    const facts: string[] = [];
    const numbers: string[] = [];
    const opinions: string[] = [];
    const evidence: string[] = [];
    const pros: string[] = [];
    const cons: string[] = [];
    const warnings: string[] = [];

    if (c.title.trim()) {
      facts.push(`후보명: ${c.title.trim()}`);
    }
    if (c.domain) {
      facts.push(`출처 도메인: ${c.domain}`);
    }
    const priceMeta = c.metadata?.priceKrw;
    if (typeof priceMeta === "number" && Number.isFinite(priceMeta)) {
      numbers.push(`표기 가격(메타): ${Math.round(priceMeta)}원`);
    }
    const priceHit = snippet.match(PRICE_RE);
    if (priceHit?.[0]) {
      numbers.push(`스니펫 수치: ${priceHit[0]}`);
    }
    if (c.reviewCount != null) {
      numbers.push(`리뷰 수: ${c.reviewCount}`);
    }
    if (snippet.length >= 12) {
      evidence.push(snippet.slice(0, 180));
    }
    if (/(?:좋|추천|만족|깔끔|가성비)/iu.test(snippet)) {
      pros.push(snippet.slice(0, 80));
    }
    if (/(?:아쉽|불편|비싸|시끄|별로)/iu.test(snippet)) {
      cons.push(snippet.slice(0, 80));
    }
    if (WARNING_RE.test(snippet)) {
      warnings.push(snippet.slice(0, 80));
    }
    if (/(?:것\s*같|추정|아마|느낀)/iu.test(snippet)) {
      opinions.push(snippet.slice(0, 80));
    }

    const weakExtract =
      facts.length + numbers.length + evidence.length < 2 || snippet.length < 20;

    return {
      candidateId: c.id,
      facts,
      opinions,
      evidence,
      numbers,
      pros,
      cons,
      warnings,
      weakExtract,
    };
  });
}
