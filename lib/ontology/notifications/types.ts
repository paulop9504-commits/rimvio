import type { BridgeStackPrepItem } from "@/lib/experience-bridge/project-bridge-stack-prep";
import type { PendingBridgeInvite } from "@/hooks/use-pending-bridge-invites";
import type { PendingGlobeLocationConfirm } from "@/lib/globe/list-pending-globe-location-confirms";
import type { MarketHandshakeOffer } from "@/lib/globe/market/market-handshake-types";

export type RimvioNotificationKind =
  | "bridge_invite"
  | "bridge_activity"
  | "location_confirm"
  | "market_align";

export type RimvioNotificationStatus = "pending" | "dismissed" | "acted";

export type RimvioNotificationSection =
  | "share"
  | "bridge_activity"
  | "location"
  | "market_align";

export type RimvioNotificationTargetKind = "experience" | "bridge";

/** Read-only notification object — projected from SSOT, not a second store. */
export type RimvioNotification = {
  id: string;
  kind: RimvioNotificationKind;
  status: RimvioNotificationStatus;
  priority: number;
  section: RimvioNotificationSection;
  title: string;
  body: string;
  primaryCtaLabel: string;
  primaryCtaHref?: string;
  dismissCtaLabel: string;
  targetKind: RimvioNotificationTargetKind;
  targetId: string;
  bridgeInvite?: PendingBridgeInvite;
  bridgeActivity?: BridgeStackPrepItem;
  locationConfirm?: PendingGlobeLocationConfirm;
  marketAlignOffer?: MarketHandshakeOffer;
};

export type ProjectPendingNotificationsInput = {
  invites: readonly PendingBridgeInvite[];
  bridgeActivities: readonly BridgeStackPrepItem[];
  locationConfirms: readonly PendingGlobeLocationConfirm[];
  marketAlignOffers?: readonly MarketHandshakeOffer[];
  dismissedIds?: ReadonlySet<string>;
};
