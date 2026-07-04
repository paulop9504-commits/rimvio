"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  composeBrainProjectionManifest,
  composeBrainProjectionManifestAsync,
  readBrainProjectionForEvent,
} from "@/lib/situation-projection/compose-brain-projection";
import { resolveHubPillTap } from "@/lib/situation-projection/resolve-hub-pill-tap";
import type {
  HubRunnablePill,
  SituationProjectionManifest,
} from "@/lib/situation-projection/types";

export function useContextBrainManifest(event: EventCandidate | null) {
  const eventId = event?.id ?? null;
  const [localManifest, setLocalManifest] = useState<SituationProjectionManifest | null>(null);
  const composeKey = useMemo(() => {
    if (!event) {
      return null;
    }
    return JSON.stringify({
      id: event.id,
      updatedAt: event.updatedAt,
      category: event.category,
      title: event.title,
      place: event.place ?? null,
      datetime: event.datetime ?? null,
      metadata: event.metadata ?? null,
    });
  }, [event]);
  const storedManifest = useMemo(
    () => (eventId ? readBrainProjectionForAnchor(eventId) : null),
    [eventId],
  );
  const manifest = useMemo(() => {
    if (!eventId) {
      return null;
    }
    if (localManifest?.anchorEventId === eventId) {
      return localManifest;
    }
    return storedManifest;
  }, [eventId, localManifest, storedManifest]);

  useEffect(() => {
    if (!event || !composeKey) {
      setLocalManifest(null);
      return;
    }

    const stored = readBrainProjectionForAnchor(event.id);
    const storedMs = Date.parse(stored?.composedAt ?? "");
    const eventMs = Date.parse(event.updatedAt ?? "");
    const shouldCompose =
      !stored || !Number.isFinite(storedMs) || (Number.isFinite(eventMs) && storedMs < eventMs);

    if (!shouldCompose) {
      setLocalManifest((current) =>
        current?.anchorEventId === event.id ? current : stored,
      );
      return;
    }

    let cancelled = false;
    const initial = composeBrainProjectionManifest({
      event,
      trigger: { source: "manual", atIso: new Date().toISOString() },
    });
    setLocalManifest(initial);

    if (event.category !== "travel") {
      void composeBrainProjectionManifestAsync({
        event,
        trigger: { source: "manual", atIso: new Date().toISOString() },
      }).then((enhanced) => {
        if (!cancelled) {
          setLocalManifest(enhanced);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [composeKey, event]);

  const openBrain = useCallback(() => {
    if (!event) {
      return null;
    }
    const initial = composeBrainProjectionManifest({
      event,
      trigger: { source: "manual", atIso: new Date().toISOString() },
    });
    setLocalManifest(initial);

    if (event.category === "travel") {
      return initial;
    }

    void composeBrainProjectionManifestAsync({
      event,
      trigger: { source: "manual", atIso: new Date().toISOString() },
    }).then((enhanced) => {
      setLocalManifest(enhanced);
    });

    return initial;
  }, [event]);

  const pills = useMemo(() => manifest?.pills ?? [], [manifest]);

  const tapPill = useCallback(
    (pill: HubRunnablePill) => {
      if (!event) {
        return null;
      }
      return resolveHubPillTap({ pill, event });
    },
    [event],
  );

  return { manifest, pills, openBrain, tapPill };
}

function readBrainProjectionForAnchor(eventId: string) {
  return readBrainProjectionForEvent(eventId);
}
