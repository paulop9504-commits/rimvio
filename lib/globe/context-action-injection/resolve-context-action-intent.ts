import type {
  ContextActionIntent,
  ContextActionIntentKind,
  ContextActionResourceKind,
} from "@/lib/globe/context-action-injection/types";

const BOOK_RE =
  /예약|부킹|booking|reserve|잡아\s*줘|잡을래|예약할|예약해/u;
const PAY_RE = /결제|페이|pay|지불|결제할|결제해/u;
const REFUND_RE = /환불|refund|취소\s*해|취소할/u;
const LODGING_RE = /숙소|호텔|hotel|stay|잠|체크인/u;
const EATERY_RE = /맛집|식당|레스토랑|restaurant|저녁|점심|식사/u;

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
