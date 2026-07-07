export type ContextAgentComposeTurnInput =
  | {
      role: "user";
      text: string;
    }
  | {
      role: "assistant";
      kind: "text" | "globe_apply" | "build_log";
      text: string;
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
    last.text === row.text
  ) {
    return last;
  }

  threads.set(id, [...existing, row].slice(-MAX_TURNS));
  emit(id);
  return row;
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
