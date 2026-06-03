"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computePredictiveDock,
  visibleDockActions,
} from "@/lib/predictive-dock/compute-predictive-dock";
import {
  listConsumedOpportunityIds,
  syncOpportunityIntentEpoch,
} from "@/lib/predictive-dock/action-opportunity-session";
import { resolveConversationIntent } from "@/lib/predictive-dock/resolve-conversation-intent";
import { readActiveChains } from "@/lib/containers/active-chains-state";
import type { ActionChatMessage } from "@/lib/action-chat/orchestrator-types";
import type { DayScheduleTask } from "@/lib/schedule/day-schedule";
import type { PredictiveDockWire } from "@/lib/predictive-dock/types";
import { syncEventLifecycle } from "@/lib/events/event-lifecycle-runner";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/events/event-store";

export function usePredictiveDock(input: {
  messages: ActionChatMessage[];
  schedule: DayScheduleTask[];
  referenceDate: string;
}) {
  const [clientReady, setClientReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [consumedRevision, setConsumedRevision] = useState(0);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) {
      return;
    }
    const onEventsUpdated = () => setTick((value) => value + 1);
    window.addEventListener(EVENT_CANDIDATES_UPDATED, onEventsUpdated);
    return () => window.removeEventListener(EVENT_CANDIDATES_UPDATED, onEventsUpdated);
  }, [clientReady]);

  useEffect(() => {
    if (!clientReady) {
      return;
    }
    syncEventLifecycle();
    const timer = window.setInterval(() => {
      syncEventLifecycle();
      setTick((value) => value + 1);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [clientReady]);

  useEffect(() => {
    if (!clientReady) {
      return;
    }
    const onConsumed = () => setConsumedRevision((value) => value + 1);
    window.addEventListener("rimvio:opportunity-consumed", onConsumed);
    return () => window.removeEventListener("rimvio:opportunity-consumed", onConsumed);
  }, [clientReady]);

  const lastUserMessage = useMemo(() => {
    for (let index = input.messages.length - 1; index >= 0; index -= 1) {
      if (input.messages[index]?.role === "user") {
        return input.messages[index]!.text;
      }
    }
    return null;
  }, [input.messages]);

  const activeChains = useMemo(
    () => (clientReady ? readActiveChains() : []),
    [clientReady, input.messages, tick]
  );

  const intent = useMemo(
    () =>
      resolveConversationIntent({
        lastUserMessage,
        messages: input.messages,
        activeChains,
      }),
    [lastUserMessage, input.messages, activeChains]
  );

  useEffect(() => {
    if (!clientReady) {
      return;
    }
    syncOpportunityIntentEpoch(intent);
  }, [clientReady, intent]);

  const consumedOpportunityIds = useMemo(
    () => (clientReady ? listConsumedOpportunityIds() : []),
    [clientReady, intent, consumedRevision]
  );

  const wire: PredictiveDockWire = useMemo(() => {
    if (!clientReady) {
      return { main_action: null, shadow_actions: [] };
    }
    return computePredictiveDock({
      messages: input.messages,
      schedule: input.schedule,
      referenceDate: input.referenceDate,
      lastUserMessage,
      now: new Date(),
      activeChains,
      consumedOpportunityIds,
    });
  }, [
    clientReady,
    input.messages,
    input.schedule,
    input.referenceDate,
    lastUserMessage,
    activeChains,
    consumedOpportunityIds,
    tick,
  ]);

  const visible = useMemo(
    () => (clientReady ? visibleDockActions(wire) : []),
    [clientReady, wire]
  );

  return { wire, visible, intent };
}
