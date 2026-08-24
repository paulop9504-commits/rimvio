export type PcContinuityIntent = "purchase";
export type PcContinuityTarget = "pc";

const PURCHASE_RE =
  /(?:쿠팡|coupang).{0,40}(?:사|주문|장바구니|열어|검색)|(?:사|주문|시켜|열어|검색).{0,24}(?:쿠팡|coupang)|(?:생수|휴지).{0,16}(?:사|주문|시켜)|물\s*(?:좀\s*)?(?:사|주문|시켜)|다시\s*사(?:줘|주세요)?|(?:사줘|사\s*주세요|주문해(?:줘|주세요)?|장바구니에?\s*담)/iu;

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
  if (/생수/u.test(text) || /(?:^|[\s,])물(?:\s+좀)?\s*(?:사|주문|시켜)/u.test(text)) {
    return "생수 구매";
  }
  if (/휴지/u.test(text)) {
    return "휴지 구매";
  }
  return "구매";
}

export function extractPcPurchaseQuery(utterance: string): string {
  const title = extractPcPurchaseTitle(utterance);
  if (title === "생수 구매") {
    return "생수";
  }
  if (title === "휴지 구매") {
    return "휴지";
  }
  const stripped = utterance
    .replace(
      /쿠팡|coupang|에서|좀|사줘|사주세요|주문해줘|주문해|주문|시켜줘|시켜|열어줘|열어|검색해|찾아줘|찾아/giu,
      " ",
    )
    .replace(/[을를이가은는]\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 48) || "생수";
}

export function resolvePcPurchaseOpenUrl(utterance: string): string {
  const query = extractPcPurchaseQuery(utterance);
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`;
}

/** Payment / 3DS — Local Agent must not start here. Search · product · cart are allowed. */
export function isPcAgentCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const blob = `${parsed.hostname}${parsed.pathname}${parsed.search}`;
    return /checkout|payment|pay\.coupang|order\/pay|billing|3d.?secure/i.test(
      blob,
    );
  } catch {
    return true;
  }
}
