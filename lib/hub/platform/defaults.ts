import { createDefaultCapabilityDraft } from "@/lib/hub/capability/defaults";
import type { PlatformDraft } from "@/lib/hub/platform/types";

export const HUB_PLATFORM_DRAFT_STORAGE_KEY = "rimvio.hub.platform-draft.v1";

export const DEFAULT_UI_ROUTES_JSON = `[
  { "path": "/", "surface": "page", "component": "PlatformHome" },
  { "path": "/listings", "surface": "page", "component": "ListingBrowse" },
  { "path": "/sell", "surface": "page", "component": "CreateListing" }
]`;

export const DEFAULT_DATA_COLLECTIONS_JSON = `[
  { "name": "listings", "schema": "listing.v1", "pii": false },
  { "name": "orders", "schema": "order.v1", "pii": true }
]`;

export function createDefaultPlatformDraft(): PlatformDraft {
  const capability = createDefaultCapabilityDraft();
  return {
    ...capability,
    id: "used.market",
    name: "Used Market Platform",
    description:
      "동네 사람들이 안 쓰는 물건을 사고팔 수 있는 중고거래 플랫폼입니다.",
    architectureNotes: "Cloud-native agent runtime · tenant-strict data isolation",
    runtimeTier: "native",
    dataCollectionsJson: DEFAULT_DATA_COLLECTIONS_JSON,
    dataIsolation: "tenant_strict",
    uiRoutesJson: DEFAULT_UI_ROUTES_JSON,
    workflowDescription:
      "Search → Create listing → Offer → Purchase with user approval on payment.",
    commerceNotes: "KR: Kakao Pay · Toss · card. US: Stripe.",
    securityScanPassed: false,
  };
}
