"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePendingBridgeInvites } from "@/hooks/use-pending-bridge-invites";
import {
  projectBridgeStackPrep,
  type BridgeStackPrepItem,
} from "@/lib/experience-bridge/project-bridge-stack-prep";
import {
  readBridgeSyncPhase,
  subscribeBridgeSyncSession,
} from "@/lib/experience-bridge/bridge-sync-session";
import { listBridgeLinkedEventIds } from "@/lib/experience-bridge/list-bridge-linked-event-ids";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";
import { EXPERIENCE_BRIDGE_UPDATED } from "@/lib/experience-bridge/local-bridge-store";
import { findLifeEventCandidate } from "@/lib/life-read-model";

export function useBridgeStackPrep(): BridgeStackPrepItem | null {
  const { user } = useAuth();
  const { invites } = usePendingBridgeInvites();
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const onRefresh = () => bump();
    window.addEventListener(EVENT_CANDIDATES_UPDATED, onRefresh);
    window.addEventListener(EXPERIENCE_BRIDGE_UPDATED, onRefresh);
    return subscribeBridgeSyncSession(onRefresh);
  }, [bump]);

  return useMemo(() => {
    void revision;
    const events = listBridgeLinkedEventIds()
      .map((eventId) => findLifeEventCandidate(eventId))
      .filter((event): event is NonNullable<typeof event> => Boolean(event));

    return projectBridgeStackPrep({
      invites,
      events,
      viewerUserId: user?.id,
    });
  }, [invites, revision, user?.id]);
}

export function useBridgeSyncPhase(eventId: string | null | undefined) {
  const key = eventId?.trim() || "";
  const [phase, setPhase] = useState(() =>
    key ? readBridgeSyncPhase(key) : "idle",
  );

  useEffect(() => {
    if (!key) {
      setPhase("idle");
      return;
    }
    setPhase(readBridgeSyncPhase(key));
    return subscribeBridgeSyncSession((changedEventId) => {
      if (!changedEventId || changedEventId === key) {
        setPhase(readBridgeSyncPhase(key));
      }
    });
  }, [key]);

  return phase;
}
