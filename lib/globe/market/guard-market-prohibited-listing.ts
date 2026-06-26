import { copy } from "@/lib/copy/human-ko";
import type { MarketIntentDetail } from "@/lib/globe/market/market-intent-detail";
import { readMarketMemoryRecord } from "@/lib/globe/market/market-intent-detail";
import type { MarketIntentDraft, MarketIntentRecord } from "@/lib/globe/market/market-intent-types";

export type MarketProhibitedListingReasonId =
  | "alcohol"
  | "tobacco"
  | "drugs"
  | "weapons"
  | "medicine"
  | "adult";

type ProhibitedRule = {
  id: MarketProhibitedListingReasonId;
  patterns: readonly RegExp[];
};

const PROHIBITED_RULES: readonly ProhibitedRule[] = [
  {
    id: "alcohol",
    patterns: [
      /(?:^|[^가-힣a-z0-9])(술|주류|맥주|소주|막걸리|와인|위스키|보드카|양주|브랜디|샴페인|사케|칵테일|맥주병|소주병|와인병)(?:[^가-힣a-z0-9]|$)/ui,
      /\b(whisky|whiskey|vodka|brandy|champagne|sake|cocktail|beer|liquor|soju|makgeolli|wine)\b/ui,
    ],
  },
  {
    id: "tobacco",
    patterns: [
      /(?:^|[^가-힣a-z0-9])(담배|궐련|전자담배|액상|니코틴|아이코스|전담|껌담|히츠|테라)(?:[^가-힣a-z0-9]|$)/ui,
      /\b(cigarette|cigar|tobacco|nicotine|iqos|veev|juul|heets|terea)\b/ui,
      /(?:^|[^가-힣a-z0-9])(글로|릴)(?:[^가-힣a-z0-9]|$)/ui,
    ],
  },
  {
    id: "drugs",
    patterns: [
      /(?:^|[^가-힣a-z0-9])(마약|대마|대마초|필로폰)(?:[^가-힣a-z0-9]|$)/ui,
      /\b(cannabis|marijuana|weed|lsd|mdma|ecstasy|cocaine|heroin|meth)\b/ui,
    ],
  },
  {
    id: "weapons",
    patterns: [
      /(?:^|[^가-힣a-z0-9])(총|권총|소총|에어건|에어소프트|실탄|탄약|화약|폭발물|도검|자동검|테이저)(?:[^가-힣a-z0-9]|$)/ui,
      /\b(shotgun|rifle|firearm|bbgun|bb\s*gun|ammo|stun\s*gun)\b/ui,
      /\bgun\b/ui,
    ],
  },
  {
    id: "medicine",
    patterns: [
      /(?:^|[^가-힣a-z0-9])(처방약|의약품)(?:[^가-힣a-z0-9]|$)/ui,
      /\b(prescription\s*drug|oxycodone|tramadol|zolpidem)\b/ui,
      /(?:^|[^가-힣a-z0-9])(수면제\s*판|진통제\s*판)(?:[^가-힣a-z0-9]|$)/ui,
    ],
  },
  {
    id: "adult",
    patterns: [
      /(?:^|[^가-힣a-z0-9])(성인용품|딜도|포르노|바이브레이터)(?:[^가-힣a-z0-9]|$)/ui,
      /\b(adult\s*toy|sex\s*toy|dildo|vibrator|porn)\b/ui,
    ],
  },
] as const;

export function collectMarketIntentSearchText(input: {
  title?: string | null;
  detail?: Partial<MarketIntentDetail> | null;
}): string {
  const detail = input.detail;
  const memory = readMarketMemoryRecord(
    detail?.memoryRecord ? { memoryRecord: detail.memoryRecord } : {},
  );
  const slotValues = detail?.prioritySlots
    ? Object.values(detail.prioritySlots).map((value) => String(value ?? ""))
    : [];

  return [
    input.title,
    detail?.productName,
    detail?.detailNote,
    detail?.sourceText,
    memory.story,
    memory.care,
    memory.why,
    memory.categoryAnswer,
    memory.seekingContext,
    memory.seekingWhy,
    ...memory.experienceTags,
    ...slotValues,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ");
}

export function detectMarketProhibitedListing(
  rawText: string,
): MarketProhibitedListingReasonId | null {
  const text = rawText.trim();
  if (!text) {
    return null;
  }
  for (const rule of PROHIBITED_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.id;
    }
  }
  return null;
}

export function detectMarketProhibitedListingFromRecord(
  record: Pick<MarketIntentRecord, "title" | "detail"> | MarketIntentDraft,
): MarketProhibitedListingReasonId | null {
  return detectMarketProhibitedListing(
    collectMarketIntentSearchText({
      title: record.title,
      detail: record.detail,
    }),
  );
}

export function isMarketListingAllowed(
  record: Pick<MarketIntentRecord, "title" | "detail"> | MarketIntentDraft,
): boolean {
  return detectMarketProhibitedListingFromRecord(record) === null;
}

export function marketProhibitedListingErrorCode(
  reasonId: MarketProhibitedListingReasonId,
): string {
  return `prohibited_listing:${reasonId}`;
}

export function readMarketProhibitedListingUserError(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("prohibited_listing:")) {
    return copy.globe.marketProhibitedListingGeneric;
  }
  const reason = trimmed.slice("prohibited_listing:".length) as MarketProhibitedListingReasonId;
  switch (reason) {
    case "alcohol":
      return copy.globe.marketProhibitedListingAlcohol;
    case "tobacco":
      return copy.globe.marketProhibitedListingTobacco;
    case "drugs":
    case "weapons":
    case "medicine":
    case "adult":
      return copy.globe.marketProhibitedListingRegulated;
    default:
      return copy.globe.marketProhibitedListingGeneric;
  }
}

export function assertMarketListingAllowed(
  record: Pick<MarketIntentRecord, "title" | "detail"> | MarketIntentDraft,
): void {
  const reason = detectMarketProhibitedListingFromRecord(record);
  if (reason) {
    throw new Error(marketProhibitedListingErrorCode(reason));
  }
}
