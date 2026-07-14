"use client";

import { openTransitNavigateFieldClient } from "@/lib/globe/transit-prep/open-transit-navigate-field-client";
import {
  commitOneShotTransitMainClient,
  runOneShotTransitPrepClient,
  type RunOneShotTransitPrepResult,
} from "@/lib/globe/transit-prep/run-one-shot-transit-prep-client";
import type { EventCandidate } from "@/lib/events/event-candidate";

export type TryCompleteTransitPrepResult = {
  readonly prep: RunOneShotTransitPrepResult | null;
  readonly committed: boolean;
  readonly fieldOpened: boolean;
  readonly navigateUrl: string | null;
};

/** After slots/chips — open NAVIGATE Field when destination is ready. */
export function tryCompleteTransitPrepClient(input: {
  message: string;
  contextEventId: string;
  event: EventCandidate | null | undefined;
  openField?: boolean;
  providerId?: "kakao_navi" | "naver_map" | "google_maps";
}): TryCompleteTransitPrepResult {
  const prep = runOneShotTransitPrepClient({
    message: input.message,
    contextEventId: input.contextEventId,
    event: input.event,
  });
  if (!prep?.plan.readyForNavigate) {
    return {
      prep,
      committed: false,
      fieldOpened: false,
      navigateUrl: null,
    };
  }

  const commit = commitOneShotTransitMainClient({
    contextEventId: input.contextEventId,
    triggerMessage: input.message,
    event: prep.event,
    prepResult: prep,
  });
  if (!commit.committed || !commit.destination) {
    return {
      prep,
      committed: false,
      fieldOpened: false,
      navigateUrl: null,
    };
  }

  const field =
    input.openField === false
      ? {
          opened: false,
          navigateUrl: null,
          capabilityDispatched: false,
          providerId: input.providerId ?? "kakao_navi",
        }
      : openTransitNavigateFieldClient({
          contextEventId: input.contextEventId,
          destination: commit.destination,
          providerId: input.providerId,
        });

  return {
    prep,
    committed: true,
    fieldOpened: field.opened,
    navigateUrl: field.navigateUrl,
  };
}
