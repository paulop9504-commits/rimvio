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
  readonly status: "open" | "opened" | "superseded";
  readonly triggerMessage?: string;
  readonly scoutKind?: "lodging" | "eatery" | "activity" | "amenity" | "mixed";
  readonly aiInsightKo?: string;
  readonly tipsKo?: readonly string[];
  readonly highlightTitles?: readonly string[];
  readonly videoContext?: ScoutFeedGateVideoContextWire | null;
  /** Inline domain correction — shown when scout results bleed across kinds. */
  readonly correctionChips?: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly action: "keep_kind" | "strip_kind";
    readonly kind: "lodging" | "eatery" | "activity" | "amenity";
  }[];
};

/** Cursor-style scout Narrator stream — one turn, live progress animation. */
export type ScoutNarrationComposePayload = {
  readonly understandingKo: string;
  readonly steps: readonly { readonly id: string; readonly textKo: string }[];
  readonly status: "running" | "done";
  readonly mode?: "Replace" | "Continue" | "Merge";
  readonly entityLabelKo?: string | null;
  readonly domain?: string | null;
};

export type OperatorAskChipsComposePayload = {
  readonly chipDomain:
    | "trip_intake"
    | "trip_experience"
    | "flight_prep"
    | "transit_prep"
    | "finance_prep"
    | "lodging_stay_revise"
    | "soft_graph_confirm"
    | "clarify_less"
    | "plan_handoff"
    | "ingress_converge"
    | "research_approval";
  readonly pendingTrigger: string;
  readonly chips: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly gapId: string;
    readonly value: string;
  }[];
  readonly status: "open" | "submitted";
  readonly selectedChipId?: string;
  readonly selectedSummaryKo?: string;
};

export type IntentExecutionTimelineLaneWire = {
  readonly id: string;
  readonly titleKo: string;
  readonly status: "pending" | "in_progress" | "done" | "waiting";
  readonly detailKo: string;
  readonly activeStage: string | null;
};

export type IntentExecutionTimelinePayload = {
  readonly profile: "trip_revise" | "generic" | "research";
  readonly currentStage: string;
  readonly lanes: readonly IntentExecutionTimelineLaneWire[];
  readonly status: "running" | "waiting_approval" | "complete";
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
      kind: "execution_timeline";
      text: string;
      payload: IntentExecutionTimelinePayload;
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
    }
  | {
      role: "assistant";
      kind: "scout_narration";
      text: string;
      payload: ScoutNarrationComposePayload;
    }
  | {
      role: "assistant";
      kind: "ask_chips";
      text: string;
      payload: OperatorAskChipsComposePayload;
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
      kind: "execution_timeline";
      text: string;
      payload: IntentExecutionTimelinePayload;
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
    }
  | {
      id: string;
      role: "assistant";
      kind: "scout_narration";
      text: string;
      payload: ScoutNarrationComposePayload;
      atIso: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "ask_chips";
      text: string;
      payload: OperatorAskChipsComposePayload;
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
    last.kind !== "scout_narration" &&
    last.kind !== "intake_slots" &&
    last.kind !== "ask_chips" &&
    last.kind !== "execution_timeline" &&
    last.text === row.text
  ) {
    return last;
  }

  threads.set(id, [...existing, row].slice(-MAX_TURNS));
  emit(id);
  return row;
}

export function patchContextAgentComposeTurn(
  eventId: string,
  turnId: string,
  patch: {
    text?: string;
    kind?: Extract<ContextAgentComposeTurn, { role: "assistant" }>["kind"];
    payload?:
      | IntentExecutionTimelinePayload
      | ScoutNarrationComposePayload
      | ScoutFeedGateComposePayload
      | ScoutCardsComposePayload
      | IntakeSlotsComposePayload
      | OperatorAskChipsComposePayload
      | LodgingRoomCardsComposePayload;
  },
): ContextAgentComposeTurn | null {
  const id = eventId.trim();
  const tid = turnId.trim();
  if (!id || !tid) {
    return null;
  }
  const existing = threads.get(id) ?? [];
  const idx = existing.findIndex((row) => row.id === tid);
  if (idx < 0) {
    return null;
  }
  const prev = existing[idx]!;
  if (prev.role !== "assistant") {
    return null;
  }
  const next = {
    ...prev,
    ...patch,
    id: prev.id,
    atIso: prev.atIso,
    role: "assistant" as const,
  } as ContextAgentComposeTurn;
  const copy = [...existing];
  copy[idx] = next;
  threads.set(id, copy);
  emit(id);
  return next;
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

function hasOpenAskChipsTurn(eventId: string): boolean {
  const rows = readContextAgentComposeThread(eventId);
  return rows.some(
    (row) =>
      row.role === "assistant" &&
      row.kind === "ask_chips" &&
      row.payload.status === "open",
  );
}

export function appendOperatorAskChipsComposeTurn(
  eventId: string,
  input: {
    chipDomain: OperatorAskChipsComposePayload["chipDomain"];
    hint: string;
    pendingTrigger: string;
    chips: OperatorAskChipsComposePayload["chips"];
  },
): ContextAgentComposeTurn | null {
  if (hasOpenAskChipsTurn(eventId)) {
    return null;
  }
  return appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "ask_chips",
    text: input.hint,
    payload: {
      chipDomain: input.chipDomain,
      pendingTrigger: input.pendingTrigger,
      chips: input.chips,
      status: "open",
    },
  });
}

export function markOperatorAskChipsTurnSubmitted(
  eventId: string,
  turnId: string,
  input: { chipId: string; summaryKo: string },
): void {
  const id = eventId.trim();
  const rows = threads.get(id) ?? [];
  const next = rows.map((row) => {
    if (row.id !== turnId || row.role !== "assistant" || row.kind !== "ask_chips") {
      return row;
    }
    return {
      ...row,
      payload: {
        ...row.payload,
        status: "submitted" as const,
        selectedChipId: input.chipId,
        selectedSummaryKo: input.summaryKo,
      },
    };
  });
  threads.set(id, next);
  emit(id);
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
    triggerMessage?: string;
    scoutKind?: ScoutFeedGateComposePayload["scoutKind"];
    aiInsightKo?: string;
    tipsKo?: readonly string[];
    highlightTitles?: readonly string[];
    videoContext?: ScoutFeedGateVideoContextWire | null;
    correctionChips?: ScoutFeedGateComposePayload["correctionChips"];
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
      triggerMessage: input.triggerMessage?.trim() || undefined,
      scoutKind: input.scoutKind,
      aiInsightKo: input.aiInsightKo,
      tipsKo: input.tipsKo,
      highlightTitles: input.highlightTitles,
      videoContext: input.videoContext ?? null,
      correctionChips: input.correctionChips,
    },
  });
}

/** Prior scout gates stay in chat but no longer claim the active discovery surface. */
export function supersedePriorScoutFeedGates(
  eventId: string,
  activeBatchId: string,
): void {
  const id = eventId.trim();
  const batchId = activeBatchId.trim();
  if (!id || !batchId) {
    return;
  }
  const rows = threads.get(id) ?? [];
  const next = rows.map((row) => {
    if (
      row.role !== "assistant" ||
      row.kind !== "scout_feed_gate" ||
      row.payload.batchId === batchId
    ) {
      return row;
    }
    return {
      ...row,
      payload: {
        ...row.payload,
        status: "superseded" as const,
      },
    };
  });
  threads.set(id, next);
  emit(id);
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

/** After domain correction chip — refresh gate summary and clear chips. */
export function patchScoutFeedGateAfterCorrection(
  eventId: string,
  input: {
    turnId: string;
    summaryKo: string;
    count: number;
    scoutKind?: ScoutFeedGateComposePayload["scoutKind"];
    highlightTitles?: readonly string[];
  },
): void {
  const id = eventId.trim();
  const turnId = input.turnId.trim();
  if (!id || !turnId) {
    return;
  }
  const rows = threads.get(id) ?? [];
  const next = rows.map((row) => {
    if (row.id !== turnId || row.role !== "assistant" || row.kind !== "scout_feed_gate") {
      return row;
    }
    return {
      ...row,
      text: input.summaryKo,
      payload: {
        ...row.payload,
        summaryKo: input.summaryKo,
        count: input.count,
        scoutKind: input.scoutKind ?? row.payload.scoutKind,
        highlightTitles: input.highlightTitles ?? row.payload.highlightTitles,
        correctionChips: [],
      },
    };
  });
  threads.set(id, next);
  emit(id);
}

export function appendScoutNarrationComposeTurn(
  eventId: string,
  payload: ScoutNarrationComposePayload,
): ContextAgentComposeTurn {
  return appendContextAgentComposeTurn(eventId, {
    role: "assistant",
    kind: "scout_narration",
    text: payload.understandingKo,
    payload: {
      ...payload,
      status: payload.status ?? "running",
    },
  });
}

export function markScoutNarrationComposeDone(
  eventId: string,
  turnId: string,
): void {
  const id = eventId.trim();
  const tid = turnId.trim();
  if (!id || !tid) {
    return;
  }
  const rows = threads.get(id) ?? [];
  const next = rows.map((row) => {
    if (row.id !== tid || row.role !== "assistant" || row.kind !== "scout_narration") {
      return row;
    }
    return {
      ...row,
      payload: {
        ...row.payload,
        status: "done" as const,
      },
    };
  });
  threads.set(id, next);
  emit(id);
}

/** Latest Narrator stream turn (running preferred, else most recent). */
export function readLatestScoutNarrationTurnId(
  eventId: string,
): string | null {
  const rows = threads.get(eventId.trim()) ?? [];
  let latest: string | null = null;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row?.role !== "assistant" || row.kind !== "scout_narration") {
      continue;
    }
    if (row.payload.status === "running") {
      return row.id;
    }
    if (!latest) {
      latest = row.id;
    }
  }
  return latest;
}

/** @deprecated Prefer readLatestScoutNarrationTurnId. */
export function readRunningScoutNarrationTurnId(
  eventId: string,
): string | null {
  const rows = threads.get(eventId.trim()) ?? [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (
      row?.role === "assistant" &&
      row.kind === "scout_narration" &&
      row.payload.status === "running"
    ) {
      return row.id;
    }
  }
  return null;
}

/**
 * Append a live progress line into the Narrator stream
 * (Cursor agent log — not a new chat bubble). Revives the latest done
 * stream briefly so widen/replan logs stay in the same terminal.
 */
export function appendScoutNarrationLiveStep(
  eventId: string,
  step: { readonly id: string; readonly textKo: string },
  turnId?: string | null,
): boolean {
  const id = eventId.trim();
  const textKo = step.textKo.trim();
  const stepId = step.id.trim();
  if (!id || !textKo || !stepId) {
    return false;
  }
  const targetId = turnId?.trim() || readLatestScoutNarrationTurnId(id);
  if (!targetId) {
    return false;
  }
  const rows = threads.get(id) ?? [];
  let changed = false;
  const next = rows.map((row) => {
    if (
      row.id !== targetId ||
      row.role !== "assistant" ||
      row.kind !== "scout_narration"
    ) {
      return row;
    }
    if (row.payload.steps.some((existing) => existing.id === stepId)) {
      return row;
    }
    changed = true;
    return {
      ...row,
      payload: {
        ...row.payload,
        status: "running" as const,
        steps: [...row.payload.steps, { id: stepId, textKo }],
      },
    };
  });
  if (!changed) {
    return false;
  }
  threads.set(id, next);
  emit(id);
  return true;
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
