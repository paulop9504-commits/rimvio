"use client";

import { useEffect, useMemo, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import { asRimvioEntityId } from "@/lib/ontology/entity-types";
import {
  queryMediaGuidesForEvent,
  replaceMediaGuidesForExperience,
} from "@/lib/ontology/media-guide-store";
import type { MediaGuideNode } from "@/lib/ontology/media-guide-types";

type MediaGuideRouteResponse = {
  ok?: boolean;
  guides?: MediaGuideNode[];
};

export function useContextMediaGuides(
  event: EventCandidate | null,
  options?: { enabled?: boolean; max?: number },
) {
  const enabled = options?.enabled !== false;
  const max = options?.max;
  const eventKey = useMemo(() => {
    if (!event) {
      return null;
    }
    return JSON.stringify({
      id: event.id,
      updatedAt: event.updatedAt,
      title: event.title,
      place: event.place ?? null,
      metadata: event.metadata ?? null,
    });
  }, [event]);
  const [guides, setGuides] = useState<MediaGuideNode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!event) {
      setGuides([]);
      setLoading(false);
      return;
    }
    setGuides(
      queryMediaGuidesForEvent(event.id, { max }).filter(
        (guide) => guide.sourceKind !== "youtube" || Boolean(guide.embedUrl?.trim()),
      ),
    );
    if (!enabled) {
      setLoading(false);
      return;
    }

    const cachedYoutube = queryMediaGuidesForEvent(event.id, { max }).filter(
      (guide) => guide.sourceKind === "youtube" && Boolean(guide.embedUrl?.trim()),
    );
    if (cachedYoutube.length >= 2) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    void fetch("/api/globe/media-guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`media_guides_${response.status}`);
        }
        return (await response.json()) as MediaGuideRouteResponse;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        const nextGuides = (Array.isArray(payload.guides) ? payload.guides : []).filter(
          (guide) => guide.sourceKind !== "youtube" || Boolean(guide.embedUrl?.trim()),
        );
        replaceMediaGuidesForExperience({
          experienceEntityId: asRimvioEntityId("experience", event.id),
          guides: nextGuides,
        });
        setGuides(queryMediaGuidesForEvent(event.id, { max }));
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setGuides(queryMediaGuidesForEvent(event.id, { max }));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, event, eventKey, max]);

  return { guides, loading };
}
