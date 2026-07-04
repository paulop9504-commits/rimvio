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
  subscribePersonaInference,
  subscribePersonaPendingLearn,
} from "@/lib/persona";
import type { WorkQueueItem } from "@/lib/work-queue";

export function usePriorityStrip(input: {
  event: EventCandidate | null;
  lat: number | null;
  lng: number | null;
  workQueue: readonly WorkQueueItem[];
  discoveryEventId?: string | null;
}) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((n) => n + 1);
    const unsubA = subscribePersonaPendingLearn(bump);
    const unsubB = subscribePersonaInference(bump);
    return () => {
      unsubA();
      unsubB();
    };
  }, []);

  const payload = useMemo(() => {
    void revision;
    const candidates = buildPriorityCandidates({
      event: input.event,
      lat: input.lat,
      lng: input.lng,
      workQueue: input.workQueue,
      discoveryEventId: input.discoveryEventId,
    });
    return resolvePriorityStrip(candidates);
  }, [input.event, input.lat, input.lng, input.workQueue, input.discoveryEventId, revision]);

  const queueCount = input.workQueue.length;

  const chooseLearn = useCallback(
    (current: PriorityStripPayload, choiceId: string) => {
      if (current.kind !== "help_learn" && current.kind !== "protect") {
        return;
      }
      const choice = current.learn.choices.find((row) => row.id === choiceId);
      if (!choice) {
        return;
      }
      recordPersonaSignal({
        axisId: current.learn.axisId,
        value: choice.value,
        labelKo: choice.labelKo,
        source: "priority_strip",
        eventId: current.learn.eventId ?? null,
      });
      completePersonaPendingLearn(current.learn.id);
    },
    [],
  );

  const dismissLearn = useCallback((current: PriorityStripPayload) => {
    if (current.kind !== "help_learn" && current.kind !== "protect") {
      return;
    }
    dismissPersonaPendingLearn(current.learn.id);
  }, []);

  return {
    payload,
    queueCount,
    chooseLearn,
    dismissLearn,
  };
}
