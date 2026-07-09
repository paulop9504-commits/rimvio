export type LiteApiPendingCheckout = {
  sessionId: string;
  contextEventId: string;
  resourceId: string;
  prebookId: string;
  transactionId: string;
  amountKrw: number;
  propertyName: string;
  offerTitle: string;
  atIso: string;
};

const STORAGE_KEY = "rimvio.liteapi-checkout-pending";

export function writeLiteApiPendingCheckout(row: LiteApiPendingCheckout): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(row));
}

export function readLiteApiPendingCheckout(): LiteApiPendingCheckout | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LiteApiPendingCheckout;
  } catch {
    return null;
  }
}

export function clearLiteApiPendingCheckout(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORAGE_KEY);
}
