"use client";

/**
 * After Field Reality Commit — densify Context Graph (ADR-037).
 * Selection → Confirmed stay · expand period · completeness inputs.
 */

import { findLifeEventCandidate } from "@/lib/life-read-model";
import {
  readLodgingBookingSlots,
  writeLodgingBookingSlots,
} from "@/lib/globe/context-hub/lodging-booking-slots";
import type { RealityOperationV1 } from "@/lib/reality-queue/types";
import { commitEventUpsert } from "@/lib/source-of-truth/commit-truth";
import {
  recordFlightCommitted,
  recordHotelCommitted,
  recordScheduleUpdated,
} from "@/lib/workstream/append-workstream-event";
import {
  buildTripStayTimeline,
  expandTripPeriodFromSegments,
  mergeTripStaySegment,
  readTripStaySegments,
  TRIP_STAY_SEGMENTS_META_KEY,
  type TripStaySegment,
} from "@/lib/workstream/build-stay-timeline";
import { computeContextCompleteness } from "@/lib/workstream/compute-context-completeness";
import {
  beginAgentExecutionSession,
  completeAgentExecutionStep,
  finishAgentExecutionSession,
  pushAgentExecutionStep,
  setAgentExecutionCommitStatus,
  setAgentExecutionHeadline,
  setAgentExecutionNextHints,
} from "@/lib/workstream/agent-execution-session";
import { syncContextWorkState } from "@/lib/workstream/sync-context-work-state";
import type { WorkstreamState } from "@/lib/workstream/types";

function toYmd(iso: string | null | undefined): string | null {
  const t = iso?.trim();
  if (!t || t.length < 10) return null;
  const ymd = t.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
}

export type PromoteRealityCommitResult = {
  readonly workstream: WorkstreamState | null;
  readonly segments: readonly TripStaySegment[];
  readonly timelineDayCount: number;
  readonly completenessPercent: number;
};

/**
 * Call after `stampCommittedOperationsOnEvent` succeeds.
 */
export function promoteRealityCommitToContextGraph(input: {
  readonly contextEventId: string;
  readonly operations: readonly RealityOperationV1[];
}): PromoteRealityCommitResult {
  const contextEventId = input.contextEventId.trim();
  const event = findLifeEventCandidate(contextEventId);
  const slots = readLodgingBookingSlots(event);
  const checkInYmd = toYmd(slots.checkInIso);
  const checkOutYmd = toYmd(slots.checkOutIso);
  const placeLabel =
    (typeof event?.place === "string" && event.place.trim()) ||
    (typeof event?.metadata?.globePlaceLabel === "string"
      ? event.metadata.globePlaceLabel
      : null);
  const now = new Date().toISOString();

  beginAgentExecutionSession({
    contextEventId,
    headlineKo: "Reality 업데이트 중…",
    statusHint: "committing",
  });
  setAgentExecutionCommitStatus("preparing");
  setAgentExecutionHeadline("Reality Commit 준비 중");

  let lastWs: WorkstreamState | null = null;
  let segments = readTripStaySegments(event?.metadata ?? null);
  let hadLodging = false;

  for (const op of input.operations) {
    if (op.type === "payment_prep") continue;

    if (op.kind === "lodging") {
      hadLodging = true;
      pushAgentExecutionStep({
        id: "commit-hotel-place",
        labelKo: "호텔 위치 저장",
        status: "running",
        contextEventId,
      });
      const hotelLabel =
        op.preview.placeLabelKo?.trim() || op.labelKo.trim() || "숙소";
      const placeId = op.sourceRef?.trim() || null;
      const segmentCheckIn = checkInYmd ?? now.slice(0, 10);
      const segmentCheckOut =
        checkOutYmd ??
        new Date(Date.parse(`${segmentCheckIn}T12:00:00.000Z`) + 86_400_000)
          .toISOString()
          .slice(0, 10);

      lastWs = recordHotelCommitted({
        contextEventId,
        labelKo: hotelLabel,
        placeId,
        objectId: op.preview.resourceId ?? op.operationId,
        placeLabel,
        locationLabel: op.preview.placeLabelKo ?? placeLabel,
        checkInYmd: segmentCheckIn,
        checkOutYmd: segmentCheckOut,
      });

      const segment: TripStaySegment = {
        id: op.operationId,
        hotelLabel,
        placeId,
        locationLabel: op.preview.placeLabelKo ?? placeLabel,
        checkInYmd: segmentCheckIn,
        checkOutYmd: segmentCheckOut,
        status: "confirmed",
        committedAtIso: now,
      };
      segments = mergeTripStaySegment(segments, segment);
      completeAgentExecutionStep("commit-hotel-place");
      pushAgentExecutionStep({
        id: "commit-hotel-dates",
        labelKo: "체크인/체크아웃 기간 반영",
        status: "done",
        contextEventId,
      });
    }

    if (op.kind === "flight") {
      lastWs = recordFlightCommitted({
        contextEventId,
        labelKo: op.labelKo || "항공",
        placeLabel,
      });
    }
  }

  const period = expandTripPeriodFromSegments(segments);
  if (period && event) {
    try {
      writeLodgingBookingSlots({
        contextEventId,
        checkInIso: period.checkInYmd,
        checkOutIso: period.checkOutYmd,
        guestCount: slots.guestCount ?? 2,
        roomCount: slots.roomCount ?? 1,
      });
    } catch {
      /* slots may reject past windows in edge tests */
    }
    pushAgentExecutionStep({
      id: "commit-timeline",
      labelKo: "여행 Timeline 업데이트",
      status: "running",
      contextEventId,
    });
    recordScheduleUpdated({
      contextEventId,
      labelKo: `${period.nights}박${period.days}일`,
      nights: period.nights,
      days: period.days,
      scheduleLabel: `${period.checkInYmd} ~ ${period.checkOutYmd}`,
      placeLabel,
    });
    completeAgentExecutionStep("commit-timeline");
  }

  if (event && segments.length > 0) {
    if (hadLodging && segments.length >= 2) {
      pushAgentExecutionStep({
        id: "commit-move-node",
        labelKo: "숙소 이동 Node 생성",
        status: "done",
        contextEventId,
      });
    }
    commitEventUpsert({
      ...event,
      metadata: {
        ...(event.metadata ?? {}),
        [TRIP_STAY_SEGMENTS_META_KEY]: {
          version: 1,
          segments,
        },
        tripContextStatus: "confirmed",
      },
      updatedAt: now,
    });
  }

  const completeness = computeContextCompleteness({
    contextEventId,
    event: findLifeEventCandidate(contextEventId),
  });
  const timeline = buildTripStayTimeline(segments);

  const work = syncContextWorkState({
    contextEventId,
    event: findLifeEventCandidate(contextEventId),
  });

  pushAgentExecutionStep({
    id: "commit-context-save",
    labelKo: `${work.title} Context 저장 완료`,
    status: "done",
    contextEventId,
  });
  setAgentExecutionNextHints(
    work.nextActions.map((a) => a.labelKo).slice(0, 3),
  );
  setAgentExecutionHeadline("Context Graph 업데이트 완료");
  setAgentExecutionCommitStatus("committed");
  finishAgentExecutionSession({ keepMs: 8_000 });

  return {
    workstream: lastWs,
    segments,
    timelineDayCount: timeline.length,
    completenessPercent: completeness.percent,
  };
}
