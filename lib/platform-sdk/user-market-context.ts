/**
 * User market dimensions — never reduce to GPS alone.
 */

import type { PlatformMarketCode, PlatformMarketContextPolicy } from "@/lib/platform-sdk/markets";

export type UserMarketContext = {
  readonly accountCountry: PlatformMarketCode;
  readonly residenceCountry?: PlatformMarketCode;
  readonly currentLocationCountry?: PlatformMarketCode;
  readonly billingCountry?: PlatformMarketCode;
  readonly shippingCountry?: PlatformMarketCode;
  readonly locale?: string;
  readonly currency?: string;
};

export const DEFAULT_USER_MARKET_CONTEXT: UserMarketContext = {
  accountCountry: "KR",
  residenceCountry: "KR",
  currentLocationCountry: "KR",
  billingCountry: "KR",
  shippingCountry: "KR",
  locale: "ko-KR",
  currency: "KRW",
};

export function resolveUserMarketForPlatform(
  user: UserMarketContext,
  policy: PlatformMarketContextPolicy,
): PlatformMarketCode {
  switch (policy) {
    case "residence_country":
      return user.residenceCountry ?? user.accountCountry;
    case "current_location":
      return user.currentLocationCountry ?? user.accountCountry;
    case "billing_country":
      return user.billingCountry ?? user.accountCountry;
    case "shipping_country":
      return user.shippingCountry ?? user.accountCountry;
    case "platform_market":
    case "account_country":
    default:
      return user.accountCountry;
  }
}

export function inferUserMarketFromUtterance(utterance: string): Partial<UserMarketContext> {
  const text = utterance.trim();
  if (/일본|japan|jp|도쿄|tokyo/i.test(text)) {
    return {
      accountCountry: "JP",
      residenceCountry: "JP",
      locale: "ja-JP",
      currency: "JPY",
    };
  }
  if (/미국|usa|us|america|뉴욕|new york/i.test(text)) {
    return {
      accountCountry: "US",
      residenceCountry: "US",
      locale: "en-US",
      currency: "USD",
    };
  }
  if (/싱가포르|singapore|sg/i.test(text)) {
    return {
      accountCountry: "SG",
      residenceCountry: "SG",
      locale: "en-SG",
      currency: "SGD",
    };
  }
  if (/한국|korea|kr|서울|seoul/i.test(text)) {
    return {
      accountCountry: "KR",
      residenceCountry: "KR",
      locale: "ko-KR",
      currency: "KRW",
    };
  }
  return {};
}

export function mergeUserMarketContext(
  base: UserMarketContext,
  patch: Partial<UserMarketContext>,
): UserMarketContext {
  return { ...base, ...patch };
}
