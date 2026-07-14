/**
 * Provider Network — supply-side identity above execution adapters.
 * @see docs/RIMVIO_PROVIDER_NETWORK.md
 */

/** How a Provider Network member supplies value. */
export const PROVIDER_KINDS = [
  "producer",
  "worker",
  "organization",
  "ai_agent",
] as const;

export type ProviderKind = (typeof PROVIDER_KINDS)[number];

export const USER_MARKET_ROLES = ["consumer", "provider"] as const;

export type UserMarketRole = (typeof USER_MARKET_ROLES)[number];

/**
 * Supply-side member in the Provider Network.
 * Distinct from execution `providerId` (adapter SKU — kakao_navi · rimvio_travel).
 */
export type ProviderNetworkMember = {
  readonly memberId: string;
  readonly kind: ProviderKind;
  readonly displayLabel: string;
  readonly capabilityIds?: readonly string[];
  readonly engineManifestIds?: readonly string[];
};

/** Marketplace wire — publisherId legacy alias. */
export type ProviderMemberRef = {
  /** SSOT — Provider Network member id. */
  readonly providerMemberId?: string;
  /** @deprecated Use providerMemberId — v1 marketplace wire alias. */
  readonly publisherId: string;
  readonly providerKind?: ProviderKind;
};

export function isProviderKind(value: string): value is ProviderKind {
  return (PROVIDER_KINDS as readonly string[]).includes(value);
}
