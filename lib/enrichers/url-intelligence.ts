import { normalizeInputUrl } from "@/lib/enrichers/fetch-page-metadata";
import { normalizeYouTubeUrl } from "@/lib/enrichers/youtube-url";

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

export function parseMapTitleFromUrl(rawUrl: string): string | null {
  try {
    const parsed = normalizeInputUrl(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host.includes("naver") && parsed.pathname.includes("/search")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const searchIndex = parts.indexOf("search");

      if (searchIndex >= 0 && parts[searchIndex + 1]) {
        return humanizeSlug(parts[searchIndex + 1]);
      }
    }

    if (host.includes("google") && parsed.pathname.startsWith("/maps")) {
      const query =
        parsed.searchParams.get("q") ??
        parsed.searchParams.get("query") ??
        parsed.searchParams.get("destination");

      if (query) {
        return humanizeSlug(query);
      }

      const placeMatch = parsed.pathname.match(/\/place\/([^/@[?]+)/i);
      if (placeMatch?.[1]) {
        return humanizeSlug(placeMatch[1]);
      }
    }

    if (host.includes("kakao") && parsed.pathname.includes("map")) {
      const query = parsed.searchParams.get("q") ?? parsed.searchParams.get("query");
      if (query) {
        return humanizeSlug(query);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function parseTitleFromUrl(rawUrl: string): string | null {
  const mapTitle = parseMapTitleFromUrl(rawUrl);
  if (mapTitle) {
    return mapTitle;
  }

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

export function parseYouTubeStartSeconds(rawUrl: string): number | null {
  try {
    const parsed = normalizeInputUrl(normalizeYouTubeUrl(rawUrl));
    const raw =
      parsed.searchParams.get("t") ?? parsed.searchParams.get("start") ?? null;

    if (!raw) {
      return null;
    }

    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }

    if (/\d+[hms]/i.test(raw)) {
      let total = 0;

      for (const match of raw.matchAll(/(\d+)([hms])/gi)) {
        const amount = Number(match[1]);
        const unit = match[2].toLowerCase();

        if (unit === "h") {
          total += amount * 3600;
        } else if (unit === "m") {
          total += amount * 60;
        } else {
          total += amount;
        }
      }

      return total > 0 ? total : null;
    }

    const match = raw.match(/^(\d+)([hms])?$/i);
    if (!match) {
      return null;
    }

    const amount = Number(match[1]);
    const unit = (match[2] ?? "s").toLowerCase();

    if (unit === "h") {
      return amount * 3600;
    }

    if (unit === "m") {
      return amount * 60;
    }

    return amount;
  } catch {
    return null;
  }
}

export function formatYouTubeTimestamp(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

const COMMERCE_HOST_SUFFIXES = [
  "yo-go.co.kr",
  "coupang.com",
  "11st.co.kr",
  "musinsa.com",
  "gmarket.co.kr",
  "amazon.co.kr",
  "amazon.com",
  "ssg.com",
  "lotte.com",
  "smartstore.naver.com",
  "shopify.com",
  "wconcept.co.kr",
  "ably.co.kr",
  "29cm.co.kr",
  "brandi.co.kr",
  "hmall.com",
  "kurly.com",
  "marketkurly.com",
  "auction.co.kr",
  "interpark.com",
  "tmon.co.kr",
  "zigzag.kr",
];

export function isCommerceDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  return COMMERCE_HOST_SUFFIXES.some((suffix) => {
    const bare = suffix.replace(/^www\./, "");
    return normalized === bare || normalized.endsWith(`.${bare}`);
  });
}

export function commercePrimaryLabel(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");

  if (normalized.includes("yo-go")) {
    return "🛒 타임딜 열기";
  }
  if (normalized.includes("coupang")) {
    return "🛒 쿠팡에서 보기";
  }
  if (normalized.includes("11st")) {
    return "🛒 11번가에서 보기";
  }
  if (normalized.includes("musinsa")) {
    return "🛒 무신사에서 보기";
  }
  if (normalized.includes("kurly") || normalized.includes("marketkurly")) {
    return "🛒 마켓컬리에서 보기";
  }
  if (normalized.includes("smartstore") || normalized.includes("shopping.naver")) {
    return "🛒 스마트스토어 보기";
  }

  return "🛒 상품 보기";
}
