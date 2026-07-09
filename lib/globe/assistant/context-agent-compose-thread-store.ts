import type { IntakeSheetField } from "@/lib/intake/intake-sheet-field-types";

export type ScoutCardsComposeRecommendation = {
  readonly kind: "lodging" | "eatery" | "activity" | "amenity";
  readonly activitySubtype?: string | null;
  readonly title: string;
  readonly reasonKo: string;
  readonly placeId: string;
  readonly lat: number;
  readonly lng: number;
};

export type ScoutCardsComposePayload = {
  readonly summaryKo: string;
  readonly scoutKind: "lodging" | "eatery" | "activity" | "amenity";
  readonly recommendations: readonly ScoutCardsComposeRecommendation[];
};

export type LodgingRoomCardsComposePayload = {
  readonly placeId: string;
  readonly resourceId: string;
  readonly title: string;
};

export type IntakeSlotsComposePayload = {
  readonly domainId: string;
  readonly submitLabel: string;
  readonly pendingTrigger: string;
  readonly fields: readonly IntakeSheetField[];
  readonly status: "open" | "submitted";
  readonly submittedSummaryKo?: string;
};

export type ScoutFeedGateVideoContextWire = {
  readonly name: string;
  readonly place: string;
  readonly kind: "lodging" | "eatery" | "place";
  readonly lat: number;
  readonly lng: number;
};

export type ScoutFeedGateComposePayload = {
  readonly summaryKo: string;
  readonly count: number;
  readonly batchId: string;
  readonly status: "open" | "opened";
  readonly scoutKind?: "lodging" | "eatery" | "activity" | "amenity" | "mixed";
  readonly aiInsightKo?: string;
  readonly tipsKo?: readonly string[];
  readonly highlightTitles?: readonly string[];
  readonly videoContext?: ScoutFeedGateVideoContextWire | null;
};

export type ContextAgentComposeTurnInput =
  | {
      role: "user";
      text: string;
    }
  | {
      role: "assistant";
      kind: "text" | "globe_apply" | "build_log";
      text: string;
    }
  | {
      role: "assistant";
      kind: "scout_cards";
      text: string;
      payload: ScoutCardsComposePayload;
    }
  | {
      role: "assistant";
      kind: "lodging_room_cards";
      text: string;
      payload: LodgingRoomCardsComposePayload;
    }
  | {
      role: "assistant";
      kind: "intake_slots";
      text: string;
      payload: IntakeSlotsComposePayload;
    }
  | {
      role: "assistant";
      kind: "scout_feed_gate";
      text: string;
      payload: ScoutFeedGateComposePayload;
    };

export type ContextAgentComposeTurn =
  | {
      id: string;
      role: "user";
      text: string;
      atIso: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "text" | "globe_apply" | "build_log";
      text: string;
      atIso: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "scout_cards";
      text: string;
      payload: ScoutCardsComposePayload;
      atIso: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "lodging_room_cards";
      text: string;
      payload: LodgingRoomCardsComposePayload;
      atIso: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "intake_slots";
      text: string;
      payload: IntakeSlotsComposePayload;
      atIso: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "scout_feed_gate";
      text: string;
      payload: ScoutFeedGateComposePayload;
      atIso: string;
    };

const EVENT_NAME = "rimvio-context-agent-compose-thread";
const MAX_TURNS = 24;

const threads = new Map<string, ContextAgentComposeTurn[]>();

function emit(eventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<{ eventId: string }>(EVENT_NAME, {
      detail: { eventId },
    }),
  );
}

function nextId(): string {
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readContextAgentComposeThread(
  eventId: string,
): readonly ContextAgentComposeTurn[] {
  const id = eventId.trim();
  if (!id) {
    return [];
  }
  return threads.get(id) ?? [];
}

export function clearContextAgentComposeThread(eventId: string): void {
  const id = eventId.trim();
  if (!id) {
    return;
  }
  threads.delete(id);
  emit(id);
}

export function appendContextAgentComposeTurn(
  eventId: string,
  turn: ContextAgentComposeTurnInput & {
    id?: string;
    atIso?: string;
  },
): ContextAgentComposeTurn {
  const id = eventId.trim();
  const row = {
    ...turn,
    id: turn.id ?? nextId(),
    atIso: turn.atIso ?? new Date().toISOString(),
  } as ContextAgentComposeTurn;

  const existing = threads.get(id) ?? [];
  const last = existing[existing.length - 1];
  if (
    last &&
    last.role === row.role &&
    "kind" in last &&
    "kind" in row &&
    last.kind === row.kind &&
    last.kind !== "scout_cards" &&
    last.kind !== "scout_feed_gate" &&
    last.kind !== "intake_slots" &&
    last.text === row.text
  ) {
    return last;
  }

  threads.set(id, [...existing, row].slice(-MAX_TURNS));
  emit(id);
  return row;
}

export function appendScoutCardsComposeTurn(
  eventId: string,
  input: ScoutCardsComposePayload,
): ContextAgentComposeTurn {
  return appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "scout_cards",
    text: input.summaryKo,
    payload: input,
  });
}

export function appendLodgingRoomCardsComposeTurn(
  eventId: string,
  input: LodgingRoomCardsComposePayload,
): ContextAgentComposeTurn {
  return appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "lodging_room_cards",
    text: input.title,
    payload: input,
  });
}

function hasOpenIntakeSlotsTurn(
  eventId: string,
  domainId: string,
): boolean {
  const rows = readContextAgentComposeThread(eventId);
  return rows.some(
    (row) =>
      row.role === "assistant" &&
      row.kind === "intake_slots" &&
      row.payload.domainId === domainId &&
      row.payload.status === "open",
  );
}

export function appendIntakeSlotsComposeTurn(
  eventId: string,
  input: {
    domainId: string;
    hint: string;
    submitLabel: string;
    pendingTrigger: string;
    fields: readonly IntakeSheetField[];
  },
): ContextAgentComposeTurn | null {
  if (hasOpenIntakeSlotsTurn(eventId, input.domainId)) {
    return null;
  }
  return appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "intake_slots",
    text: input.hint,
    payload: {
      domainId: input.domainId,
      submitLabel: input.submitLabel,
      pendingTrigger: input.pendingTrigger,
      fields: input.fields,
      status: "open",
    },
  });
}

export function markIntakeSlotsComposeTurnSubmitted(
  eventId: string,
  turnId: string,
  submittedSummaryKo: string,
): void {
  const id = eventId.trim();
  const rows = threads.get(id) ?? [];
  const next = rows.map((row) => {
    if (row.id !== turnId || row.role !== "assistant" || row.kind !== "intake_slots") {
      return row;
    }
    return {
      ...row,
      payload: {
        ...row.payload,
        status: "submitted" as const,
        submittedSummaryKo,
      },
    };
  });
  threads.set(id, next);
  emit(id);
}

export function appendScoutFeedGateTurn(
  eventId: string,
  input: {
    summaryKo: string;
    count: number;
    batchId: string;
    scoutKind?: ScoutFeedGateComposePayload["scoutKind"];
    aiInsightKo?: string;
    tipsKo?: readonly string[];
    highlightTitles?: readonly string[];
    videoContext?: ScoutFeedGateVideoContextWire | null;
  },
): ContextAgentComposeTurn {
  return appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "scout_feed_gate",
    text: input.summaryKo,
    payload: {
      summaryKo: input.summaryKo,
      count: input.count,
      batchId: input.batchId,
      status: "open",
      scoutKind: input.scoutKind,
      aiInsightKo: input.aiInsightKo,
      tipsKo: input.tipsKo,
      highlightTitles: input.highlightTitles,
      videoContext: input.videoContext ?? null,
    },
  });
}

export function markScoutFeedGateOpened(eventId: string, turnId: string): void {
  const id = eventId.trim();
  const rows = threads.get(id) ?? [];
  const next = rows.map((row) => {
    if (row.id !== turnId || row.role !== "assistant" || row.kind !== "scout_feed_gate") {
      return row;
    }
    return {
      ...row,
      payload: {
        ...row.payload,
        status: "opened" as const,
      },
    };
  });
  threads.set(id, next);
  emit(id);
}

export function subscribeContextAgentComposeThread(
  listener: (eventId: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ eventId: string }>).detail;
    listener(detail.eventId);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
