import type {
  ContextActionIntent,
  ContextActionIntentKind,
  ContextActionResourceKind,
} from "@/lib/globe/context-action-injection/types";

const BOOK_RE =
  /예약|예매|부킹|booking|reserve|잡아\s*줘|잡을래|예약할|예약해|예매할|예매해/u;
const PAY_RE = /결제|페이|pay|지불|결제할|결제해/u;
const REFUND_RE = /환불|refund|취소\s*해|취소할/u;
const LODGING_RE = /숙소|호텔|hotel|stay|잠|체크인|캡슐|사우나|게스트하우스|료칸/u;
const EATERY_RE = /맛집|식당|레스토랑|restaurant|저녁|점심|식사/u;

/** 「다이토요 예매할게」 → 다이토요 */
export function extractBookingTargetLabel(message: string): string | null {
  const text = message.trim();
  if (!text) {
    return null;
  }
  const named = text.match(
    /^(.+?)\s*(?:을|를)?\s*(?:예매|예약|부킹|booking|reserve)(?:\s*준비)?(?:\s*(?:해(?:\s*(?:줄|주))?(?:게|요|주세요|라)?|할(?:게|래요|까|래)?|하자|해))?$/iu,
  );
  if (named?.[1]?.trim()) {
    const label = named[1]
      .trim()
      .replace(/(?:을|를|이|가|은|는)$/u, "")
      .trim();
    if (
      label.length >= 1 &&
      label.length <= 40 &&
      !/여기|이\s*곳|이것|그거|해당|호텔|숙소|맛집|식당/iu.test(label)
    ) {
      return label;
    }
  }
  return null;
}

export function normalizePlaceMatchLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s&·\-_/(),.［］[\]『』「」""'']/gu, "");
}

/** Fuzzy title match — 「다이토요」 in 「사우나&캡슐호텔 다이토요」. */
export function placeLabelMatchesQuery(
  title: string,
  query: string,
): boolean {
  const hay = normalizePlaceMatchLabel(title);
  const needle = normalizePlaceMatchLabel(query);
  if (!hay || !needle || needle.length < 2) {
    return false;
  }
  return hay.includes(needle) || needle.includes(hay);
}

function resolveResourceKind(
  message: string,
  hint?: ContextActionResourceKind | null,
): ContextActionResourceKind {
  if (LODGING_RE.test(message)) {
    return "lodging";
  }
  if (EATERY_RE.test(message)) {
    return "eatery";
  }
  return hint ?? "lodging";
}

function resolveIntentKind(
  message: string,
  resourceKind: ContextActionResourceKind,
): ContextActionIntentKind | null {
  if (REFUND_RE.test(message)) {
    return "refund";
  }
  if (PAY_RE.test(message)) {
    return resourceKind === "lodging" ? "pay_lodging" : "pay_eatery";
  }
  if (BOOK_RE.test(message)) {
    return resourceKind === "lodging" ? "book_lodging" : "book_eatery";
  }
  return null;
}

/** Natural language → bound-context action intent (Field handoff precursor). */
export function resolveContextActionIntent(input: {
  message: string;
  pinnedResourceKind?: ContextActionResourceKind | null;
}): ContextActionIntent | null {
  const text = input.message.trim();
  if (!text) {
    return null;
  }
  const resourceKind = resolveResourceKind(text, input.pinnedResourceKind);
  const kind = resolveIntentKind(text, resourceKind);
  if (!kind) {
    return null;
  }
  return {
    kind,
    resourceKind,
    confidence: 0.92,
  };
}

export function isContextActionIntentMessage(message: string): boolean {
  return resolveContextActionIntent({ message }) != null;
}
