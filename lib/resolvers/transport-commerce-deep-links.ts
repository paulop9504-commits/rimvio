import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim();
  } catch {
    return value.replace(/\+/g, " ").trim();
  }
}

function humanizeSlug(value: string) {
  const decoded = decodeSegment(value);
  const cleaned = decoded
    .replace(/\.(html?|php|aspx)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 2 || cleaned.length > 100) {
    return null;
  }

  if (/^[a-f0-9-]{20,}$/i.test(cleaned)) {
    return null;
  }

  return /[a-zA-Z가-힣0-9]/.test(cleaned) ? cleaned : null;
}

/** Best-effort product/place hint from URL path when og title is weak. */
export function parseHintFromUrlPath(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];

    if (last) {
      return humanizeSlug(last);
    }
  } catch {
    // Ignore invalid URLs.
  }

  return null;
}

export function buildCommerceAppHref(rawUrl: string, domain: string): string | null {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  try {
    const url = normalizeInputUrl(rawUrl).href;

    if (normalized.includes("coupang")) {
      const productId =
        url.match(/\/products?\/(\d+)/i)?.[1] ??
        url.match(/\/vp\/(\d+)/i)?.[1];
      if (productId) {
        return `coupang://product?productId=${productId}`;
      }
    }

    if (normalized.includes("11st")) {
      return `elevenst://loadurl?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("musinsa")) {
      return `musinsaapp://web?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("gmarket")) {
      return `gmarket://open?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("smartstore") || normalized.includes("shopping.naver")) {
      return `naversearchapp://inappbrowser?url=${encodeURIComponent(url)}&target=new`;
    }

    if (normalized.includes("ably")) {
      return `ably://web?url=${encodeURIComponent(url)}`;
    }

    if (normalized.includes("zigzag")) {
      return `zigzag://open?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function commerceAppLabel(domain: string): string {
  const normalized = domain.toLowerCase();

  if (normalized.includes("coupang")) {
    return "📱 쿠팡 앱으로";
  }
  if (normalized.includes("11st")) {
    return "📱 11번가 앱으로";
  }
  if (normalized.includes("musinsa")) {
    return "📱 무신사 앱으로";
  }
  if (normalized.includes("gmarket")) {
    return "📱 G마켓 앱으로";
  }
  if (normalized.includes("smartstore") || normalized.includes("shopping.naver")) {
    return "📱 네이버쇼핑 앱으로";
  }
  if (normalized.includes("ably")) {
    return "📱 에이블리 앱으로";
  }
  if (normalized.includes("zigzag")) {
    return "📱 지그재그 앱으로";
  }

  return "📱 쇼핑 앱으로";
}

export type TransportKind = "stay" | "train" | "transit" | "navigation" | "mobility";

export function detectTransportKind(rawUrl: string, domain: string): TransportKind {
  const target = `${domain} ${rawUrl}`.toLowerCase();

  if (/yanolja|goodchoice|yeogi|airbnb|booking\.com|agoda|hotels\.com|hotel/i.test(target)) {
    return "stay";
  }

  if (/korail|letskorail|srail|etk\.srail|korail\.com|train/i.test(target)) {
    return "train";
  }

  if (/tmap|t-map/i.test(target)) {
    return "navigation";
  }

  if (/bus\.kakao|kakaobus|bustago|subway|metro|transit|kakaomap.*bus/i.test(target)) {
    return "transit";
  }

  return "mobility";
}

export function transportPrimaryLabel(kind: TransportKind) {
  switch (kind) {
    case "stay":
      return "🏨 숙소 보기";
    case "train":
      return "🚄 기차 예매 열기";
    case "transit":
      return "🚌 대중교통 열기";
    case "navigation":
      return "🚗 T맵 길찾기";
    default:
      return "🚉 교통 열기";
  }
}

export function buildTransportAppHref(
  rawUrl: string,
  domain: string,
  kind: TransportKind,
  hint: string | null
): string | null {
  const query = hint?.trim();
  const encodedUrl = encodeURIComponent(rawUrl);

  switch (kind) {
    case "navigation":
      if (query) {
        return `tmap://search?name=${encodeURIComponent(query)}`;
      }
      return `tmap://openurl?url=${encodedUrl}`;
    case "train":
      return null;
    case "stay":
      if (/yanolja/i.test(domain)) {
        return `yanoljamotel://open?url=${encodedUrl}`;
      }
      return null;
    case "transit":
      if (query) {
        return `kakaomap://search?q=${encodeURIComponent(query)}`;
      }
      return null;
    default:
      return null;
  }
}

export function transportAppLabel(kind: TransportKind) {
  switch (kind) {
    case "navigation":
      return "📱 T맵 앱으로";
    case "stay":
      return "📱 야놀자 앱으로";
    case "transit":
      return "🗺 카카오맵 검색";
    default:
      return "📱 교통 앱으로";
  }
}

const TRANSPORT_HOST_SUFFIXES = [
  "yanolja.com",
  "nol.yanolja.com",
  "goodchoice.net",
  "yeogi.com",
  "korail.com",
  "letskorail.com",
  "srail.or.kr",
  "etk.srail.kr",
  "tmap.co.kr",
  "tmapmobility.com",
  "bus.kakao.com",
  "kakaobus.com",
  "bustago.or.kr",
  "airbus.koreaairports.co.kr",
  "klook.com",
  "trip.com",
  "kakaomobility.com",
];

export function isTransportDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  return TRANSPORT_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.replace(/^www\./, "");
    return normalized === bare || normalized.endsWith(`.${bare}`);
  });
}

export function isTransportUrl(rawUrl: string) {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (isTransportDomain(host)) {
      return true;
    }

    if (/t\.kakao\.com|kakaot\.com/i.test(host)) {
      return /train|bus|subway|mobility|transit/i.test(parsed.pathname + parsed.search);
    }

    return false;
  } catch {
    return false;
  }
}
