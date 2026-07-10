export type LiteApiEnvironment = "sandbox" | "production";

const RATES_BASE = "https://api.liteapi.travel/v3.0";
const BOOK_BASE = "https://book.liteapi.travel/v3.0";

export function readLiteApiKey(): string | null {
  const value = process.env.LITEAPI_API_KEY?.trim();
  return value || null;
}

export function isLiteApiConfigured(): boolean {
  return readLiteApiKey() != null;
}

export function resolveLiteApiEnvironment(): LiteApiEnvironment {
  const key = readLiteApiKey();
  if (key?.startsWith("prod_")) {
    return "production";
  }
  return "sandbox";
}

/** Payment SDK publicKey — must match API key environment. */
export function resolveLiteApiPaymentPublicKey(): "live" | "sandbox" {
  return resolveLiteApiEnvironment() === "production" ? "live" : "sandbox";
}

export function readLiteApiDisplayCurrency(): string {
  return process.env.LITEAPI_DISPLAY_CURRENCY?.trim().toUpperCase() || "KRW";
}

export function readLiteApiGuestNationality(): string {
  return process.env.LITEAPI_GUEST_NATIONALITY?.trim().toUpperCase() || "KR";
}

export function readLiteApiSearchRadiusM(): number {
  const raw = Number(process.env.LITEAPI_SEARCH_RADIUS_M);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 5_000;
  }
  return Math.round(raw);
}

export function readLiteApiMarginPercent(): number | null {
  const raw = Number(process.env.LITEAPI_MARGIN_PERCENT);
  if (!Number.isFinite(raw) || raw < 0) {
    return null;
  }
  return raw;
}

export function liteApiRatesUrl(path: string): string {
  return `${RATES_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function liteApiBookUrl(path: string): string {
  return `${BOOK_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
