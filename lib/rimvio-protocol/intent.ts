/**
 * Rimvio Intent — first-class routing entity.
 * docs/RIMVIO_OS_CONSTITUTION.md §7
 */

import type { PlatformMarketCode } from "@/lib/platform-sdk/types";

export const RIMVIO_INTENT_ACTIONS = [
  "search",
  "sell",
  "buy",
  "book",
  "reserve",
  "pay",
  "message",
  "compare",
  "verify",
  "create",
  "update",
  "delete",
] as const;

export type RimvioIntentAction = (typeof RIMVIO_INTENT_ACTIONS)[number];

export type RimvioIntentFrame = {
  readonly action: RimvioIntentAction | string;
  readonly object?: string | null;
  readonly objectKind?: string | null;
  readonly market?: PlatformMarketCode | null;
  readonly location?: "current" | "specified" | null;
  readonly locationLabel?: string | null;
  readonly constraints?: Readonly<Record<string, unknown>>;
  readonly confidence: "confirmed" | "inferred" | "suggested";
  readonly sourceUtterance?: string | null;
};

const SELL_RE = /팔|등록|sell|listing|나눔/i;
const BUY_RE = /사|구매|buy|찾|검색|search/i;
const BOOK_RE = /예약|book|reserve/i;

/** Deterministic MVP compiler — NL pipeline extends, does not replace. */
export function compileIntentFromUtterance(utterance: string): RimvioIntentFrame | null {
  const text = utterance.trim();
  if (!text) return null;

  let action: RimvioIntentAction | string = "search";
  if (SELL_RE.test(text)) action = "sell";
  else if (BUY_RE.test(text)) action = "buy";
  else if (BOOK_RE.test(text)) action = "book";

  let object: string | null = null;
  if (/자전거|bike/i.test(text)) object = "bicycle";
  else if (/책|book/i.test(text)) object = "book";
  else if (/맥북|macbook|노트북/i.test(text)) object = "laptop";

  let market: PlatformMarketCode | null = "KR";
  if (/일본|japan|jp/i.test(text)) market = "JP";
  else if (/미국|usa|us/i.test(text)) market = "US";

  return {
    action,
    object,
    objectKind: object,
    market,
    location: /근처|동네|near/i.test(text) ? "current" : null,
    confidence: "inferred",
    sourceUtterance: text,
  };
}
