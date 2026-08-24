export type PendingPcPurchase = {
  utterance: string;
  contextEventId: string | null;
  taskId: string | null;
  createdAt: string;
};

const KEY = "rimvio-pc-pending-purchase";
let memory: PendingPcPurchase | null = null;

function canUseSession(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readPendingPcPurchase(): PendingPcPurchase | null {
  if (canUseSession()) {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as PendingPcPurchase;
      if (!parsed?.utterance?.trim()) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  return memory;
}

export function writePendingPcPurchase(input: {
  utterance: string;
  contextEventId?: string | null;
  taskId?: string | null;
}): PendingPcPurchase {
  const next: PendingPcPurchase = {
    utterance: input.utterance.trim(),
    contextEventId: input.contextEventId?.trim() || null,
    taskId: input.taskId?.trim() || null,
    createdAt: new Date().toISOString(),
  };
  memory = next;
  if (canUseSession()) {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function patchPendingPcPurchase(patch: Partial<PendingPcPurchase>): PendingPcPurchase | null {
  const cur = readPendingPcPurchase();
  if (!cur) {
    return null;
  }
  const next: PendingPcPurchase = { ...cur, ...patch };
  memory = next;
  if (canUseSession()) {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}

export function clearPendingPcPurchase(): void {
  memory = null;
  if (canUseSession()) {
    sessionStorage.removeItem(KEY);
  }
}

export function resetPendingPcPurchaseForTests(): void {
  clearPendingPcPurchase();
}
