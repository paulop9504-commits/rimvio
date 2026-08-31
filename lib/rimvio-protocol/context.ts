/**
 * Rimvio Context — standardized Agent / Platform envelope.
 * docs/RIMVIO_OS_CONSTITUTION.md §6
 */

import type { PlatformMarketCode } from "@/lib/platform-sdk/types";
import type { RimvioOsEntityRef } from "@/lib/rimvio-protocol/object-model";
import type { RimvioIntentFrame } from "@/lib/rimvio-protocol/intent";

export const RIMVIO_CONTEXT_PATHS = [
  "user.id",
  "user.account_country",
  "user.residence_country",
  "user.current_location_country",
  "user.billing_country",
  "user.shipping_country",
  "market.country",
  "locale.language",
  "locale.currency",
  "location.coords",
  "location.label",
  "device.locale",
  "device.type",
  "session.platform_id",
  "session.object",
  "session.task_id",
  "intent.action",
  "intent.object",
  "permissions.granted",
] as const;

export type RimvioContextPath = (typeof RIMVIO_CONTEXT_PATHS)[number];

export type RimvioUserContext = {
  readonly id: string;
  readonly accountCountry: PlatformMarketCode;
  readonly residenceCountry?: PlatformMarketCode;
  readonly currentLocationCountry?: PlatformMarketCode;
  readonly billingCountry?: PlatformMarketCode;
  readonly shippingCountry?: PlatformMarketCode;
};

export type RimvioLocaleContext = {
  readonly language: string;
  readonly currency: string;
  readonly timezone?: string;
};

export type RimvioLocationContext = {
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly labelKo?: string | null;
};

export type RimvioSessionContext = {
  readonly platformId?: string | null;
  readonly object?: RimvioOsEntityRef | null;
  readonly taskId?: string | null;
};

/** Full context envelope passed to Capability / Policy evaluation. */
export type RimvioContextEnvelope = {
  readonly user: RimvioUserContext;
  readonly locale: RimvioLocaleContext;
  readonly location?: RimvioLocationContext;
  readonly market: { readonly country: PlatformMarketCode };
  readonly intent?: RimvioIntentFrame | null;
  readonly session?: RimvioSessionContext;
  readonly permissions?: readonly string[];
  readonly atIso: string;
};

export function contextPathValues(
  envelope: RimvioContextEnvelope,
): Record<string, unknown> {
  return {
    "user.id": envelope.user.id,
    "user.account_country": envelope.user.accountCountry,
    "user.residence_country": envelope.user.residenceCountry ?? envelope.user.accountCountry,
    "user.current_location_country":
      envelope.user.currentLocationCountry ?? envelope.user.accountCountry,
    "user.billing_country": envelope.user.billingCountry ?? envelope.user.accountCountry,
    "user.shipping_country": envelope.user.shippingCountry ?? envelope.user.accountCountry,
    "market.country": envelope.market.country,
    "locale.language": envelope.locale.language,
    "locale.currency": envelope.locale.currency,
    "location.coords": envelope.location
      ? { lat: envelope.location.lat, lng: envelope.location.lng }
      : null,
    "location.label": envelope.location?.labelKo ?? null,
    "intent.action": envelope.intent?.action ?? null,
    "intent.object": envelope.intent?.object ?? null,
    "permissions.granted": envelope.permissions ?? [],
  };
}
