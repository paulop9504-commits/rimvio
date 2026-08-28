/**
 * Platform Market Deployment — Platform ≠ Country.
 * docs/adr/056-platform-market-deployment.md
 */

export const PLATFORM_MARKET_CODES = ["KR", "JP", "US", "SG", "GLOBAL"] as const;
export type PlatformMarketCode = (typeof PLATFORM_MARKET_CODES)[number];

export type PlatformMarketStatus = "draft" | "review" | "approved" | "suspended";

export type MarketReadinessCheckpoint =
  | "localization"
  | "currency"
  | "payment"
  | "tax"
  | "legal"
  | "privacy"
  | "data_policy"
  | "terms"
  | "shipping"
  | "seller_flow"
  | "commerce";

export type MarketReadinessState = "complete" | "pending" | "warning";

export type MarketReviewDimension =
  | "technical"
  | "security"
  | "localization"
  | "payment"
  | "privacy"
  | "commerce"
  | "policy";

export type MarketReviewStatus = "approved" | "pending" | "warning" | "rejected";

export type PlatformMarketLocale = {
  readonly languages: readonly string[];
  readonly default: string;
};

export type PlatformMarketCommerce = {
  readonly paymentConfigured: boolean;
  readonly taxConfigured: boolean;
  readonly settlementCurrency: string;
  readonly sellerTypes: readonly ("individual" | "business")[];
};

export type PlatformMarketReview = {
  readonly technical: MarketReviewStatus;
  readonly security: MarketReviewStatus;
  readonly localization: MarketReviewStatus;
  readonly payment: MarketReviewStatus;
  readonly privacy: MarketReviewStatus;
  readonly commerce: MarketReviewStatus;
  readonly policy: MarketReviewStatus;
};

export type PlatformMarketDeployment = {
  readonly country: PlatformMarketCode;
  readonly status: PlatformMarketStatus;
  readonly primary?: boolean;
  readonly locale: PlatformMarketLocale;
  readonly currency: string;
  readonly timezone: string;
  readonly addressSystem: string;
  readonly dataResidency?: string;
  /** Capability ids enabled in this market; omit = all platform capabilities */
  readonly capabilityIds?: readonly string[];
  readonly readiness: Readonly<Record<MarketReadinessCheckpoint, MarketReadinessState>>;
  readonly review?: PlatformMarketReview;
  readonly commerce?: PlatformMarketCommerce;
};

/** How platform picks user market for discovery / routing */
export type PlatformMarketContextPolicy =
  | "account_country"
  | "residence_country"
  | "current_location"
  | "billing_country"
  | "shipping_country"
  | "platform_market";

export type PlatformMarketsDeclaration = {
  readonly primary: PlatformMarketCode;
  readonly deployments: readonly PlatformMarketDeployment[];
  readonly contextPolicy: PlatformMarketContextPolicy;
};

export type PlatformOperatorDeclaration = {
  readonly name: string;
  readonly headquartersCountry: PlatformMarketCode;
};

export type MarketCatalogEntry = {
  readonly code: PlatformMarketCode;
  readonly label: string;
  readonly labelKo: string;
  readonly flag: string;
  readonly currency: string;
  readonly currencySymbol: string;
  readonly timezone: string;
  readonly addressSystem: string;
  readonly defaultLocale: string;
  readonly dataResidencyRegion: string;
};

export const MARKET_CATALOG: Record<Exclude<PlatformMarketCode, "GLOBAL">, MarketCatalogEntry> = {
  KR: {
    code: "KR",
    label: "South Korea",
    labelKo: "대한민국",
    flag: "🇰🇷",
    currency: "KRW",
    currencySymbol: "₩",
    timezone: "Asia/Seoul",
    addressSystem: "KR",
    defaultLocale: "ko-KR",
    dataResidencyRegion: "ap-northeast-2",
  },
  JP: {
    code: "JP",
    label: "Japan",
    labelKo: "일본",
    flag: "🇯🇵",
    currency: "JPY",
    currencySymbol: "¥",
    timezone: "Asia/Tokyo",
    addressSystem: "JP",
    defaultLocale: "ja-JP",
    dataResidencyRegion: "ap-northeast-1",
  },
  US: {
    code: "US",
    label: "United States",
    flag: "🇺🇸",
    labelKo: "미국",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/New_York",
    addressSystem: "US",
    defaultLocale: "en-US",
    dataResidencyRegion: "us-east-1",
  },
  SG: {
    code: "SG",
    label: "Singapore",
    labelKo: "싱가포르",
    flag: "🇸🇬",
    currency: "SGD",
    currencySymbol: "S$",
    timezone: "Asia/Singapore",
    addressSystem: "SG",
    defaultLocale: "en-SG",
    dataResidencyRegion: "ap-southeast-1",
  },
};

const READINESS_KEYS: readonly MarketReadinessCheckpoint[] = [
  "localization",
  "currency",
  "payment",
  "tax",
  "legal",
  "privacy",
  "data_policy",
  "terms",
  "shipping",
  "seller_flow",
  "commerce",
];

export function isRealMarketCode(code: PlatformMarketCode): code is Exclude<PlatformMarketCode, "GLOBAL"> {
  return code !== "GLOBAL";
}

export function createDefaultMarketDeployment(
  country: Exclude<PlatformMarketCode, "GLOBAL">,
  opts?: { primary?: boolean; status?: PlatformMarketStatus },
): PlatformMarketDeployment {
  const catalog = MARKET_CATALOG[country];
  const readiness = Object.fromEntries(
    READINESS_KEYS.map((k) => [
      k,
      k === "localization" || k === "currency" ? "complete" : ("pending" as MarketReadinessState),
    ]),
  ) as Record<MarketReadinessCheckpoint, MarketReadinessState>;

  return {
    country,
    status: opts?.status ?? "draft",
    primary: opts?.primary,
    locale: { languages: [catalog.defaultLocale.split("-")[0]!], default: catalog.defaultLocale },
    currency: catalog.currency,
    timezone: catalog.timezone,
    addressSystem: catalog.addressSystem,
    dataResidency: catalog.dataResidencyRegion,
    readiness,
    review: {
      technical: "pending",
      security: "pending",
      localization: "approved",
      payment: "pending",
      privacy: "pending",
      commerce: "pending",
      policy: "pending",
    },
    commerce: {
      paymentConfigured: false,
      taxConfigured: false,
      settlementCurrency: catalog.currency,
      sellerTypes: ["individual", "business"],
    },
  };
}

export function createDefaultMarketsDeclaration(
  primary: Exclude<PlatformMarketCode, "GLOBAL"> = "KR",
): PlatformMarketsDeclaration {
  return {
    primary,
    contextPolicy: "account_country",
    deployments: [createDefaultMarketDeployment(primary, { primary: true })],
  };
}

export function synthesizeMarketsDeclaration(
  input?: Partial<PlatformMarketsDeclaration> | null,
): PlatformMarketsDeclaration {
  if (input?.deployments?.length) {
    return {
      primary: input.primary ?? input.deployments[0]!.country,
      contextPolicy: input.contextPolicy ?? "account_country",
      deployments: input.deployments,
    };
  }
  return createDefaultMarketsDeclaration("KR");
}

export function computeMarketReadinessPercent(deployment: PlatformMarketDeployment): number {
  const total = READINESS_KEYS.length;
  const complete = READINESS_KEYS.filter((k) => deployment.readiness[k] === "complete").length;
  return Math.round((complete / total) * 100);
}

export function isMarketPublishReady(deployment: PlatformMarketDeployment): boolean {
  return computeMarketReadinessPercent(deployment) === 100 && deployment.status !== "suspended";
}

export function canPublishAnyMarket(markets: PlatformMarketsDeclaration): boolean {
  const real = markets.deployments.filter((d) => isRealMarketCode(d.country));
  return real.some(isMarketPublishReady);
}

export function marketsBlockingPublishKo(markets: PlatformMarketsDeclaration): string | null {
  const real = markets.deployments.filter((d) => isRealMarketCode(d.country));
  if (real.length === 0) {
    return "최소 한 개 국가 Market Deployment가 필요합니다.";
  }
  const ready = real.filter(isMarketPublishReady);
  if (ready.length === 0) {
    const names = real.map((d) => MARKET_CATALOG[d.country as Exclude<PlatformMarketCode, "GLOBAL">].labelKo);
    return `${names.join(", ")} Market 설정이 100% 완료되어야 Publish할 수 있습니다.`;
  }
  return null;
}

export function deploymentSupportsCapability(
  deployment: PlatformMarketDeployment,
  capabilityId: string,
): boolean {
  if (!deployment.capabilityIds?.length) return true;
  return deployment.capabilityIds.includes(capabilityId);
}

export function approvedMarketsForPlatform(
  markets: PlatformMarketsDeclaration,
): readonly PlatformMarketDeployment[] {
  return markets.deployments.filter(
    (d) =>
      isRealMarketCode(d.country) &&
      (d.status === "approved" || isMarketPublishReady(d)),
  );
}

export function formatMarketDeploymentLabel(deployment: PlatformMarketDeployment): string {
  if (!isRealMarketCode(deployment.country)) return "Global";
  const c = MARKET_CATALOG[deployment.country];
  return `${c.flag} ${c.label}`;
}
