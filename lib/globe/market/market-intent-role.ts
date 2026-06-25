import type { MarketIntentRole } from "@/lib/globe/market/market-intent-types";
import { copy } from "@/lib/copy/human-ko";

export function invertMarketIntentRole(
  role: MarketIntentRole,
): MarketIntentRole {
  return role === "seeking" ? "listing" : "seeking";
}

export function marketIntentRoleLabelKo(role: MarketIntentRole): string {
  return role === "seeking"
    ? copy.globe.marketPinRoleSeeking
    : copy.globe.marketPinRoleListing;
}

export function resolveOtherPartyMarketRole(
  viewerRole: MarketIntentRole | null | undefined,
): MarketIntentRole | null {
  if (viewerRole === "seeking" || viewerRole === "listing") {
    return invertMarketIntentRole(viewerRole);
  }
  return null;
}

export function resolveViewerMarketRole(input: {
  viewerUserId: string;
  seekingUserId: string;
  listingUserId: string;
}): MarketIntentRole | null {
  if (input.viewerUserId === input.seekingUserId) {
    return "seeking";
  }
  if (input.viewerUserId === input.listingUserId) {
    return "listing";
  }
  return null;
}
