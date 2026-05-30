import { stripHtmlTags } from "@/lib/commerce/commerce-cleaner";
import type { MarketListing } from "@/lib/commerce/market-listing";

export type { MarketListing };

type NaverShopItem = {
  title?: string;
  lprice?: string;
  link?: string;
};

type NaverShopResponse = {
  items?: NaverShopItem[];
};

const NAVER_SHOP_ENDPOINT = "https://openapi.naver.com/v1/search/shop.json";

function readNaverCredentials() {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export function hasNaverShoppingCredentials() {
  return readNaverCredentials() !== null;
}

export async function fetchNaverShoppingListings(
  query: string,
  options?: { display?: number; usedBias?: boolean }
): Promise<MarketListing[]> {
  const credentials = readNaverCredentials();
  if (!credentials) {
    return [];
  }

  const searchQuery = options?.usedBias ? `${query} 중고` : query;
  const params = new URLSearchParams({
    query: searchQuery,
    display: String(Math.min(Math.max(options?.display ?? 20, 1), 100)),
    sort: "asc",
  });

  const response = await fetch(`${NAVER_SHOP_ENDPOINT}?${params.toString()}`, {
    headers: {
      "X-Naver-Client-Id": credentials.clientId,
      "X-Naver-Client-Secret": credentials.clientSecret,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as NaverShopResponse;
  const items = payload.items ?? [];

  const listings: MarketListing[] = [];

  for (const item of items) {
    const title = stripHtmlTags(item.title ?? "");
    const price = Number.parseInt(item.lprice ?? "", 10);

    if (!title || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    listings.push({
      title,
      price,
      link: item.link,
      source: "naver_shop",
    });
  }

  return listings;
}
