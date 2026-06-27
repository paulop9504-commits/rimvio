"use client";

import { useEffect, useRef, useState } from "react";
import type {
  GlobeMapIntentSupplyAck,
  GlobeMapIntentSupplyPending,
} from "@/lib/globe/intent-supply/globe-map-intent-types";
import {
  subscribeGlobeIntentSupplyAck,
  subscribeGlobeIntentSupplyClear,
  subscribeGlobeIntentSupplyPending,
} from "@/lib/globe/intent-supply/globe-intent-supply-bridge";

const ACK_TTL_MS = 10_000;

export type GlobeMapIntentPromptState =
  | { phase: "idle" }
  | { phase: "pending"; pending: GlobeMapIntentSupplyPending }
  | { phase: "ack"; ack: GlobeMapIntentSupplyAck };

/** Map prompt rail — intent parse + context connection feedback. */
export function useGlobeMapIntentPromptRail(): GlobeMapIntentPromptState {
  const [state, setState] = useState<GlobeMapIntentPromptState>({ phase: "idle" });
  const ackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeGlobeIntentSupplyPending((pending) => {
      setState({ phase: "pending", pending });
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeIntentSupplyAck((ack) => {
      setState({ phase: "ack", ack });
    });
  }, []);

  useEffect(() => {
    return subscribeGlobeIntentSupplyClear(() => {
      setState({ phase: "idle" });
    });
  }, []);

  useEffect(() => {
    if (ackTimerRef.current != null) {
      window.clearTimeout(ackTimerRef.current);
      ackTimerRef.current = null;
    }
    if (state.phase !== "ack") {
      return;
    }
    const eventId = state.ack.eventId;
    ackTimerRef.current = window.setTimeout(() => {
      setState((current) =>
        current.phase === "ack" && current.ack.eventId === eventId
          ? { phase: "idle" }
          : current,
      );
    }, ACK_TTL_MS);
    return () => {
      if (ackTimerRef.current != null) {
        window.clearTimeout(ackTimerRef.current);
      }
    };
  }, [state]);

  return state;
}
