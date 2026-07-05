import {
  RECALL_MIN_INTERVAL_MS,
  RECALL_SAME_EVENT_COOLDOWN_MS,
} from "@/lib/recall/recall-types";

const STORAGE_KEY = "rimvio-recall-engine.v2";

type RecallShownEntry = {
  candidateId: string;
  eventId: string;
  shownAtIso: string;
};

let memoryEntries: RecallShownEntry[] = [];

function readEntries(): RecallShownEntry[] {
  if (typeof window === "undefined") {
    return memoryEntries;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecallShownEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: RecallShownEntry[]) {
  if (typeof window === "undefined") {
    memoryEntries = entries;
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota
  }
}

/** Proactive recall — max once per RECALL_MIN_INTERVAL (5 days) + per-event cooldown. */
export function canSurfaceRecallCandidate(
  candidateId: string,
  eventId: string,
  now = new Date(),
): boolean {
  const id = candidateId.trim();
  const pastEventId = eventId.trim();
  if (!id || !pastEventId) {
    return false;
  }

  const nowMs = now.getTime();
  const entries = readEntries().filter((entry) => {
    const ms = Date.parse(entry.shownAtIso);
    return !Number.isNaN(ms) && nowMs - ms < RECALL_SAME_EVENT_COOLDOWN_MS * 2;
  });

  const recent = entries.sort(
    (left, right) => Date.parse(right.shownAtIso) - Date.parse(left.shownAtIso),
  )[0];

  if (recent) {
    const lastMs = Date.parse(recent.shownAtIso);
    if (!Number.isNaN(lastMs) && nowMs - lastMs < RECALL_MIN_INTERVAL_MS) {
      return false;
    }
  }

  const sameEventRecently = entries.some((entry) => {
    if (entry.eventId !== pastEventId) {
      return false;
    }
    const ms = Date.parse(entry.shownAtIso);
    return !Number.isNaN(ms) && nowMs - ms < RECALL_SAME_EVENT_COOLDOWN_MS;
  });

  return !sameEventRecently;
}

export function markRecallCandidateShown(
  candidateId: string,
  eventId: string,
  now = new Date(),
) {
  const entries = readEntries();
  entries.push({
    candidateId: candidateId.trim(),
    eventId: eventId.trim(),
    shownAtIso: now.toISOString(),
  });
  writeEntries(entries.slice(-30));
}

export function resetRecallSpamGateForTests() {
  memoryEntries = [];
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}
