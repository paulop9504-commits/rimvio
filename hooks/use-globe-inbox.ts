"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePendingBridgeInvites } from "@/hooks/use-pending-bridge-invites";
import { useGpsTrackingEnabled } from "@/hooks/use-gps-tracking-enabled";
import { listBridgeLinkedEventIds } from "@/lib/experience-bridge/list-bridge-linked-event-ids";
import { listBridgeStackPrepItems } from "@/lib/experience-bridge/project-bridge-stack-prep";
import { listPendingGlobeLocationConfirms } from "@/lib/globe/list-pending-globe-location-confirms";
import {
  persistNotificationDismiss,
  readDismissedLocationEventIds,
  readDismissedNotificationIds,
} from "@/lib/ontology";
import {
  projectPendingNotifications,
} from "@/lib/globe/inbox/project-pending-notifications";
import type { RimvioNotification } from "@/lib/globe/inbox/notification-types";
import { EVENT_CANDIDATES_UPDATED, findLifeEventCandidate } from "@/lib/life-read-model";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { subscribeBridgeSyncSession } from "@/lib/experience-bridge/bridge-sync-session";
import { usePendingMarketAlignInbox } from "@/hooks/use-pending-market-align-inbox";

/** Globe home — notification objects projected from SSOT (inbox SSOT). */
export function useGlobeInbox(enabled = true) {
  const { user } = useAuth();
  const { enabled: gpsEnabled } = useGpsTrackingEnabled();
  const bridge = usePendingBridgeInvites(enabled);
  const marketAlign = usePendingMarketAlignInbox(enabled && Boolean(user?.id));
  const [dismissedRevision, setDismissedRevision] = useState(0);
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
    const bump = () => setDataRevision((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, bump);
    window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
    const unsub = subscribeBridgeSyncSession(bump);
    return () => {
      window.removeEventListener(EVENT_CANDIDATES_UPDATED, bump);
      window.removeEventListener(EXPERIENCE_BRIDGE_UPDATED, bump);
      unsub();
    };
  }, []);

  const dismissedIds = useMemo(() => {
    void dismissedRevision;
    return readDismissedNotificationIds();
  }, [dismissedRevision]);

  const notifications = useMemo((): RimvioNotification[] => {
    void dataRevision;
    const bridgeActivities = listBridgeStackPrepItems({
      invites: bridge.invites,
      events: listBridgeLinkedEventIds()
        .map((eventId) => findLifeEventCandidate(eventId))
        .filter((event): event is NonNullable<typeof event> => Boolean(event)),
      viewerUserId: user?.id,
    });
    const locationConfirms = listPendingGlobeLocationConfirms({
      dismissedIds: readDismissedLocationEventIds(),
      gpsEnabled,
    });

    return projectPendingNotifications({
      invites: bridge.invites,
      bridgeActivities,
      locationConfirms,
      marketAlignOffers: marketAlign.offers,
      dismissedIds,
    });
  }, [bridge.invites, dataRevision, dismissedIds, gpsEnabled, marketAlign.offers, user?.id]);

  const dismissNotification = useCallback((id: string) => {
    persistNotificationDismiss(id);
    setDismissedRevision((value) => value + 1);
  }, []);

  const refreshData = useCallback(() => {
    setDataRevision((value) => value + 1);
  }, []);

  return {
    notifications,
    bridgeInvites: bridge.invites,
    totalCount: notifications.length,
    loading: bridge.loading,
    bridgeError: bridge.error,
    needsLogin: bridge.needsLogin,
    refreshBridgeInvites: bridge.refresh,
    dismissBridgeInvite: bridge.dismissInvite,
    dismissNotification,
    refreshData,
    hasItems: notifications.length > 0,
  };
}
