"use client";

import type { HubLodgingCheckoutSession } from "@/lib/globe/hub-checkout/types";

export type LodgingCheckoutMode = "standard" | "express";

export type LodgingCheckoutActiveState = {
  mode: LodgingCheckoutMode;
  session: HubLodgingCheckoutSession;
  /** Room list owner — `${contextEventId}:${resourceId}` */
  ownerKey: string;
  offerId: string;
};

type LodgingCheckoutListener = (state: LodgingCheckoutActiveState | null) => void;

let active: LodgingCheckoutActiveState | null = null;
const listeners = new Set<LodgingCheckoutListener>();

function emit(): void {
  for (const listener of listeners) {
    listener(active);
  }
}

export function getActiveLodgingCheckout(): LodgingCheckoutActiveState | null {
  return active;
}

export function openLodgingCheckoutState(next: LodgingCheckoutActiveState): void {
  active = next;
  emit();
}

export function closeLodgingCheckoutState(): void {
  if (!active) {
    return;
  }
  active = null;
  emit();
}

export function switchLodgingCheckoutToStandard(): void {
  if (!active) {
    return;
  }
  active = { ...active, mode: "standard" };
  emit();
}

export function subscribeLodgingCheckoutState(
  listener: LodgingCheckoutListener,
): () => void {
  listeners.add(listener);
  listener(active);
  return () => {
    listeners.delete(listener);
  };
}
