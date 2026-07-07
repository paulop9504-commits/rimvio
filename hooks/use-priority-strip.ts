"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EventCandidate } from "@/lib/events/event-candidate";
import {
  buildPriorityCandidates,
  resolvePriorityStrip,
  type PriorityStripPayload,
} from "@/lib/globe/priority-strip";
import {
  completePersonaPendingLearn,
  dismissPersonaPendingLearn,
  recordPersonaSignal,
  subscribePersonaPendingLearn,
} from "@/lib/persona";
import type { WorkQueueItem } from "@/lib/work-queue";

type UsePriorityStripOptions = {
  event: EventCandidate | null;
  lat: number | null;
  lng: number | null;
  workQueue: readonly WorkQueueItem[];
  discoveryEventId?: string | null;
};

type UsePriorityStripResult = {
  payload: PriorityStripPayload | null;
  chooseLearn: (payload: PriorityStripPayload, choiceId: string) => void;
  dismissLearn: (payload: PriorityStripPayload) => void;
};

export function usePriorityStrip(
  options: UsePriorityStripOptions,
): UsePriorityStripResult {
  const { event, lat, lng, workQueue, discoveryEventId = null } = options;
  const [revision, setRevision] = useState(0);

  useEffect(() => subscribePersonaPendingLearn(() => setRevision((value) => value + 1)), []);

  const payload = useMemo(() => {
    void revision;
    const candidates = buildPriorityCandidates({
      event,
      lat,
      lng,
      workQueue,
      discoveryEventId,
    });
    return resolvePriorityStrip(candidates);
  }, [discoveryEventId, event, lat, lng, revision, workQueue]);

  const chooseLearn = useCallback((strip: PriorityStripPayload, choiceId: string) => {
    if (strip.kind !== "help_learn" && strip.kind !== "protect") {
      return;
    }
    const choice = strip.learn.choices.find((row) => row.id === choiceId);
    if (!choice) {
      return;
    }
    recordPersonaSignal({
      axisId: strip.learn.axisId,
      value: choice.value,
      labelKo: choice.labelKo,
      source: "manual",
      eventId: strip.learn.eventId ?? null,
    });
    completePersonaPendingLearn(strip.learn.id);
    setRevision((value) => value + 1);
  }, []);

  const dismissLearn = useCallback((strip: PriorityStripPayload) => {
    if (strip.kind !== "help_learn" && strip.kind !== "protect") {
      return;
    }
    dismissPersonaPendingLearn(strip.learn.id);
    setRevision((value) => value + 1);
  }, []);

  return {
    payload,
    chooseLearn,
    dismissLearn,
  };
}
