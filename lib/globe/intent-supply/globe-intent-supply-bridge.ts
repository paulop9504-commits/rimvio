import type {
  GlobeMapIntentSupplyAck,
  GlobeMapIntentSupplyPending,
} from "@/lib/globe/intent-supply/globe-map-intent-types";

export const GLOBE_INTENT_SUPPLY_PENDING = "rimvio:globe-intent-supply-pending";
export const GLOBE_INTENT_SUPPLY_ACK = "rimvio:globe-intent-supply-ack";
export const GLOBE_INTENT_SUPPLY_CLEAR = "rimvio:globe-intent-supply-clear";

export function dispatchGlobeIntentSupplyPending(detail: GlobeMapIntentSupplyPending): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeMapIntentSupplyPending>(GLOBE_INTENT_SUPPLY_PENDING, { detail }),
  );
}

export function dispatchGlobeIntentSupplyAck(detail: GlobeMapIntentSupplyAck): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<GlobeMapIntentSupplyAck>(GLOBE_INTENT_SUPPLY_ACK, { detail }),
  );
}

export function dispatchGlobeIntentSupplyClear(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(GLOBE_INTENT_SUPPLY_CLEAR));
}

export function subscribeGlobeIntentSupplyPending(
  listener: (detail: GlobeMapIntentSupplyPending) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeMapIntentSupplyPending>).detail);
  };
  window.addEventListener(GLOBE_INTENT_SUPPLY_PENDING, handler);
  return () => window.removeEventListener(GLOBE_INTENT_SUPPLY_PENDING, handler);
}

export function subscribeGlobeIntentSupplyAck(
  listener: (detail: GlobeMapIntentSupplyAck) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    listener((event as CustomEvent<GlobeMapIntentSupplyAck>).detail);
  };
  window.addEventListener(GLOBE_INTENT_SUPPLY_ACK, handler);
  return () => window.removeEventListener(GLOBE_INTENT_SUPPLY_ACK, handler);
}

export function subscribeGlobeIntentSupplyClear(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(GLOBE_INTENT_SUPPLY_CLEAR, listener);
  return () => window.removeEventListener(GLOBE_INTENT_SUPPLY_CLEAR, listener);
}
