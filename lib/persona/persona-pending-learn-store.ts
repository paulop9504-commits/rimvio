import {
  PERSONA_PENDING_LEARN_STORAGE_KEY,
  PERSONA_PENDING_LEARN_UPDATED,
  type PersonaPendingLearn,
} from "@/lib/persona/types";

type PendingSnapshot = {
  version: 1;
  items: PersonaPendingLearn[];
  /** Learn ids dismissed without answering (no write). */
  dismissedIds: string[];
};

function emptySnapshot(): PendingSnapshot {
  return { version: 1, items: [], dismissedIds: [] };
}

function readSnapshot(): PendingSnapshot {
  if (typeof window === "undefined") {
    return emptySnapshot();
  }
  try {
    const raw = window.localStorage.getItem(PERSONA_PENDING_LEARN_STORAGE_KEY);
    if (!raw) {
      return emptySnapshot();
    }
    const parsed = JSON.parse(raw) as PendingSnapshot;
    return {
      version: 1,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      dismissedIds: Array.isArray(parsed.dismissedIds) ? parsed.dismissedIds : [],
    };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(snapshot: PendingSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      PERSONA_PENDING_LEARN_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
    window.dispatchEvent(new CustomEvent(PERSONA_PENDING_LEARN_UPDATED));
  } catch {
    // quota / private mode
  }
}

export function listPendingPersonaLearns(): PersonaPendingLearn[] {
  const snapshot = readSnapshot();
  const dismissed = new Set(snapshot.dismissedIds);
  return snapshot.items
    .filter((row) => !dismissed.has(row.id))
    .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
}

export function offerPersonaPendingLearn(
  input: Omit<PersonaPendingLearn, "id" | "createdAtIso"> & {
    id?: string;
    createdAtIso?: string;
  },
): PersonaPendingLearn {
  const item: PersonaPendingLearn = {
    id: input.id ?? `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    axisId: input.axisId,
    titleKo: input.titleKo,
    choices: input.choices,
    eventId: input.eventId ?? null,
    kind: input.kind,
    autoExpand: input.autoExpand,
    createdAtIso: input.createdAtIso ?? new Date().toISOString(),
  };
  const snapshot = readSnapshot();
  const withoutDup = snapshot.items.filter(
    (row) =>
      !(
        row.axisId === item.axisId &&
        (row.eventId ?? null) === (item.eventId ?? null)
      ),
  );
  writeSnapshot({
    ...snapshot,
    items: [item, ...withoutDup].slice(0, 20),
    dismissedIds: snapshot.dismissedIds.filter((id) => id !== item.id),
  });
  return item;
}

export function dismissPersonaPendingLearn(id: string): void {
  const snapshot = readSnapshot();
  writeSnapshot({
    ...snapshot,
    items: snapshot.items.filter((row) => row.id !== id),
    dismissedIds: [...new Set([id, ...snapshot.dismissedIds])].slice(0, 40),
  });
}

export function completePersonaPendingLearn(id: string): void {
  const snapshot = readSnapshot();
  writeSnapshot({
    ...snapshot,
    items: snapshot.items.filter((row) => row.id !== id),
  });
}

export function isPersonaPendingLearnDismissed(id: string): boolean {
  return readSnapshot().dismissedIds.includes(id);
}

export function subscribePersonaPendingLearn(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(PERSONA_PENDING_LEARN_UPDATED, listener);
  return () =>
    window.removeEventListener(PERSONA_PENDING_LEARN_UPDATED, listener);
}
