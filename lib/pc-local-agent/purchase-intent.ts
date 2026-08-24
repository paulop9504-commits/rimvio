export type PcContinuityIntent = "purchase";
export type PcContinuityTarget = "pc";

const PURCHASE_RE =
  /(?:쿠팡|coupang).{0,40}(?:사|주문|장바구니|열어)|(?:사|주문|시켜|열어).{0,24}(?:쿠팡|coupang)|(?:생수|휴지).{0,16}(?:사|주문|시켜)|물\s*(?:좀\s*)?(?:사|주문|시켜)|다시\s*사(?:줘|주세요)?/iu;

export function isPcPurchaseContinuityUtterance(utterance: string): boolean {
  const text = utterance.trim();
  if (!text) {
    return false;
  }
  return PURCHASE_RE.test(text);
}

export function resolvePcContinuityTarget(
  utterance: string,
): PcContinuityTarget | null {
  if (isPcPurchaseContinuityUtterance(utterance)) {
    return "pc";
  }
  return null;
}

export function extractPcPurchaseTitle(utterance: string): string {
  const text = utterance.trim();
  if (/생수/u.test(text) || /물.{0,12}(?:사|주문|시켜)/u.test(text)) {
    return "생수 구매";
  }
  if (/휴지/u.test(text)) {
    return "휴지 구매";
  }
  return "구매";
}
