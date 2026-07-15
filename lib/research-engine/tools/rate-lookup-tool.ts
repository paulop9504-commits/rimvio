import type {
  ResearchTool,
  ResearchToolCall,
} from "@/lib/research-engine/tools/types";

const PRICE_RE =
  /(?:₩|원|KRW)?\s*([\d,.]+)\s*(?:만원|만\s*원|원)|([\d,.]+)\s*만/iu;

function readMeta(
  metadata: Record<string, string | number | boolean | null> | undefined,
  key: string,
): number | null {
  const v = metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parsePriceFromSnippet(snippet: string): number | null {
  const hit = snippet.match(PRICE_RE);
  if (!hit) {
    return null;
  }
  if (hit[0] && /만/iu.test(hit[0]) && hit[1]) {
    const n = Number(String(hit[1]).replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n * 10_000) : null;
  }
  if (hit[2]) {
    const n = Number(String(hit[2]).replace(/,/g, ""));
    return Number.isFinite(n) ? Math.round(n * 10_000) : null;
  }
  if (hit[1]) {
    const n = Number(String(hit[1]).replace(/,/g, ""));
    return Number.isFinite(n) && n >= 1000 ? Math.round(n) : null;
  }
  return null;
}

/** Soft rate — snippet/runtime fetch → priceKrw. */
export const rateLookupTool: ResearchTool = {
  id: "rate_lookup",
  labelKo: "요금 조회",
  async run({ candidate, context }): Promise<ResearchToolCall> {
    const lat = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lat",
    );
    const lng = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lng",
    );
    const calledArgs = {
      title: candidate.title,
      placeId: candidate.id,
      lat,
      lng,
    };

    const existing = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "priceKrw",
    );
    if (existing != null && existing > 0) {
      return {
        toolId: "rate_lookup",
        candidateId: candidate.id,
        status: "skip",
        summaryKo: "rate_lookup: 요금 이미 있음 — 생략",
        filledAxes: ["priceFit"],
        patch: null,
        evidence: {
          called: "liteapi.rate",
          args: calledArgs,
          got: { priceKrw: existing },
          gotLine: "already_have",
        },
      };
    }

    let priceKrw: number | null = parsePriceFromSnippet(candidate.snippet);
    let fromLiteApi = false;
    if (priceKrw == null && context.runtime?.fetchRate) {
      try {
        const fetched = await context.runtime.fetchRate({
          title: candidate.title,
          placeId: candidate.id,
          lat,
          lng,
        });
        if (fetched?.priceKrw != null && fetched.priceKrw > 0) {
          priceKrw = fetched.priceKrw;
          fromLiteApi = true;
        }
      } catch {
        // soft fail
      }
    }

    if (priceKrw == null || priceKrw <= 0) {
      return {
        toolId: "rate_lookup",
        candidateId: candidate.id,
        status: "skip",
        summaryKo: "rate_lookup: LiteAPI 요금 없음",
        filledAxes: [],
        patch: null,
        evidence: {
          called: "liteapi.rate",
          args: calledArgs,
          got: null,
          gotLine: "empty",
        },
      };
    }

    const man = Math.round(priceKrw / 10_000);
    return {
      toolId: "rate_lookup",
      candidateId: candidate.id,
      status: "ok",
      summaryKo: `rate_lookup: 1박 약 ${man}만 원`,
      filledAxes: ["priceFit"],
      patch: {
        metadata: { priceKrw, rateLookup: true },
        snippetAppend: `1박 약 ${man}만`,
      },
      evidence: {
        called: "liteapi.rate",
        args: calledArgs,
        got: { priceKrw, source: fromLiteApi ? "liteapi" : "snippet" },
        gotLine: `priceKrw=${priceKrw} · ~${man}만`,
      },
    };
  },
};
