/**
 * Rimvio Identity — personal · platform · organization facets.
 * docs/RIMVIO_OS_CONSTITUTION.md §4
 */

import type { PlatformMarketCode } from "@/lib/platform-sdk/types";

export type RimvioPersonalIdentity = {
  readonly userId: string;
  readonly displayName?: string | null;
  readonly locale?: string | null;
  readonly avatarUrl?: string | null;
};

export type RimvioPlatformIdentityRole =
  | "owner"
  | "developer"
  | "seller"
  | "buyer"
  | "admin"
  | "moderator";

export type RimvioPlatformIdentity = {
  readonly platformId: string;
  readonly roles: readonly RimvioPlatformIdentityRole[];
  readonly sellerId?: string | null;
  readonly verified?: boolean;
};

export type RimvioOrganizationRole = "member" | "admin" | "billing" | "viewer";

export type RimvioOrganizationIdentity = {
  readonly organizationId: string;
  readonly roles: readonly RimvioOrganizationRole[];
  readonly verified?: boolean;
};

export type RimvioOrganization = {
  readonly id: string;
  readonly name: string;
  readonly headquartersCountry: PlatformMarketCode;
  readonly verification: "unverified" | "verified" | "enterprise";
  readonly platformIds: readonly string[];
  readonly capabilityIds: readonly string[];
};

export type RimvioUserIdentity = {
  readonly personal: RimvioPersonalIdentity;
  readonly platformIdentities: readonly RimvioPlatformIdentity[];
  readonly organizations: readonly RimvioOrganizationIdentity[];
  readonly walletId?: string | null;
};

export type RimvioTrustBadge =
  | "identity_verified"
  | "security_reviewed"
  | "commerce_verified"
  | "market_approved";

export type RimvioTrustLevel =
  | "unverified"
  | "verified"
  | "trusted"
  | "commerce_verified"
  | "enterprise_verified";

export type RimvioTrustProfile = {
  readonly level: RimvioTrustLevel;
  readonly badges: readonly RimvioTrustBadge[];
  readonly approvedMarkets: readonly PlatformMarketCode[];
};
