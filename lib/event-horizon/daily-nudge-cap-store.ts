const PUSH_COUNT_KEY = "rimvio:guardian:event-horizon-push-count";
export const EVENT_HORIZON_DAILY_PUSH_CAP = 1;

type PushCountRecord = {
  dateKey: string;
  count: number;
};

function readRecord(): PushCountRecord | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PUSH_COUNT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PushCountRecord;
    if (!parsed?.dateKey || typeof parsed.count !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeRecord(record: PushCountRecord): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(PUSH_COUNT_KEY, JSON.stringify(record));
  } catch {
    /* noop */
  }
}

export function readEventHorizonPushCount(dateKey: string): number {
  const record = readRecord();
  if (!record || record.dateKey !== dateKey) {
    return 0;
  }
  return record.count;
}

/** Reserve one push slot for the day; returns false when cap exceeded. */
export function tryConsumeEventHorizonPushSlot(dateKey: string): boolean {
  const current = readEventHorizonPushCount(dateKey);
  if (current >= EVENT_HORIZON_DAILY_PUSH_CAP) {
    return false;
  }
  writeRecord({ dateKey, count: current + 1 });
  return true;
}

export function resetEventHorizonPushCapForTests(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(PUSH_COUNT_KEY);
  } catch {
    /* noop */
  }
}
