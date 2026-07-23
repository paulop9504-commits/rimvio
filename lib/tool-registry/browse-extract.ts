/**
 * browse.extract — allowlisted agentic browse Tool (prepare-only).
 * Seed adapters now; live browser runner plugs in later behind the same contract.
 * Never Commits Reality — candidates stamp Diff only.
 */

import type { PlaceSearchHit } from "@/lib/search-engine/run-place-search";

export const BROWSE_EXTRACT_TOOL_ID = "browse.extract" as const;

/** Host allowlist — Tool may only target these (SSRF guard). */
export const BROWSE_EXTRACT_ALLOWLIST = [
  "usj.co.jp",
  "www.usj.co.jp",
  "tokyodisneyresort.jp",
  "www.tokyodisneyresort.jp",
  "klook.com",
  "www.klook.com",
] as const;

export type BrowseExtractOffer = {
  readonly id: string;
  readonly labelKo: string;
  readonly amountLabel: string | null;
  readonly priceKrw: number | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly sourceUrl: string;
  readonly host: string;
  readonly reservable: boolean;
};

export type BrowseExtractResult = {
  readonly ok: true;
  readonly query: string;
  readonly host: string | null;
  readonly offers: readonly BrowseExtractOffer[];
  readonly summaryKo: string;
  /** Seed vs future live browser. */
  readonly via: "seed" | "live";
};

const TICKET_BROWSE_RE =
  /입장권|티켓|ticket|예매|공식\s*사이트|사이트에서|브라우|browse|구매\s*할|살\s*수/iu;

const KNOWN_POI_BROWSE_RE =
  /유니버설|유니버셜|usj|universal|디즈니|disney|디즈니랜드|disneysea|클룩|klook/iu;

export function isBrowseExtractQuery(text: string): boolean {
  const q = text.trim();
  if (!q) {
    return false;
  }
  if (TICKET_BROWSE_RE.test(q) && KNOWN_POI_BROWSE_RE.test(q)) {
    return true;
  }
  if (TICKET_BROWSE_RE.test(q) && /테마\s*파크|놀이\s*공원|액티비티/iu.test(q)) {
    return true;
  }
  // Explicit browse intent alone with a place name.
  if (
    /(?:공식|사이트|티켓|입장권).*(?:보|찾|알려|얼마)|(?:보|찾|알려|얼마).*(?:티켓|입장권)/iu.test(
      q,
    ) &&
    KNOWN_POI_BROWSE_RE.test(q)
  ) {
    return true;
  }
  return false;
}

export function isBrowseAllowlistedHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^www\./u, "");
  return BROWSE_EXTRACT_ALLOWLIST.some((row) => {
    const allowed = row.replace(/^www\./u, "");
    return h === allowed || h.endsWith(`.${allowed}`);
  });
}

const SEED_USJ: readonly BrowseExtractOffer[] = [
  {
    id: "browse:usj:1day-adult",
    labelKo: "USJ 1일권 (성인)",
    amountLabel: "약 ₩120,000",
    priceKrw: 120_000,
    lat: 34.6654,
    lng: 135.4323,
    sourceUrl: "https://www.usj.co.jp/ticket/",
    host: "www.usj.co.jp",
    reservable: true,
  },
  {
    id: "browse:usj:1day-child",
    labelKo: "USJ 1일권 (어린이)",
    amountLabel: "약 ₩78,000",
    priceKrw: 78_000,
    lat: 34.6654,
    lng: 135.4323,
    sourceUrl: "https://www.usj.co.jp/ticket/",
    host: "www.usj.co.jp",
    reservable: true,
  },
  {
    id: "browse:usj:express",
    labelKo: "USJ 익스프레스 패스",
    amountLabel: "약 ₩200,000",
    priceKrw: 200_000,
    lat: 34.6654,
    lng: 135.4323,
    sourceUrl: "https://www.usj.co.jp/ticket/",
    host: "www.usj.co.jp",
    reservable: true,
  },
];

const SEED_DISNEY: readonly BrowseExtractOffer[] = [
  {
    id: "browse:tdr:1day",
    labelKo: "도쿄 디즈니 1일권",
    amountLabel: "약 ₩110,000",
    priceKrw: 110_000,
    lat: 35.6329,
    lng: 139.8804,
    sourceUrl: "https://www.tokyodisneyresort.jp/ticket/",
    host: "www.tokyodisneyresort.jp",
    reservable: true,
  },
];

function pickSeedOffers(query: string): {
  offers: readonly BrowseExtractOffer[];
  host: string | null;
} {
  const q = query.trim();
  if (/유니버설|유니버셜|usj|universal/iu.test(q)) {
    return { offers: SEED_USJ, host: "www.usj.co.jp" };
  }
  if (/디즈니|disney/iu.test(q)) {
    return { offers: SEED_DISNEY, host: "www.tokyodisneyresort.jp" };
  }
  return { offers: [], host: null };
}

/**
 * Run browse.extract — seed catalog for allowlisted travel ticket pages.
 * Live Playwright/Browserbase adapters must call through this entry only.
 */
export function runBrowseExtract(input: {
  readonly query: string;
}): BrowseExtractResult {
  const query = input.query.trim();
  if (!query) {
    return {
      ok: true,
      query: "",
      host: null,
      offers: [],
      summaryKo: "검색어가 없어요",
      via: "seed",
    };
  }

  const { offers, host } = pickSeedOffers(query);
  if (host && !isBrowseAllowlistedHost(host)) {
    return {
      ok: true,
      query,
      host: null,
      offers: [],
      summaryKo: "허용되지 않은 사이트예요",
      via: "seed",
    };
  }

  if (offers.length === 0) {
    return {
      ok: true,
      query,
      host: null,
      offers: [],
      summaryKo: "브라우징으로 찾을 티켓이 아직 없어요",
      via: "seed",
    };
  }

  return {
    ok: true,
    query,
    host,
    offers,
    summaryKo: `${offers.length}개 티켓 옵션을 사이트에서 모았어요`,
    via: "seed",
  };
}

export function browseOffersToPlaceHits(
  offers: readonly BrowseExtractOffer[],
): PlaceSearchHit[] {
  return offers.map((o) => ({
    id: o.id,
    labelKo: o.labelKo,
    domain: "poi" as const,
    lat: o.lat ?? 0,
    lng: o.lng ?? 0,
    rating: null,
    walkMinutes: null,
    reservable: o.reservable,
    localFavorite: false,
    priceBand: o.priceKrw != null ? Math.round(o.priceKrw / 50_000) : null,
    source: "seed" as const,
    amountLabel: o.amountLabel,
    priceKrw: o.priceKrw,
  }));
}
