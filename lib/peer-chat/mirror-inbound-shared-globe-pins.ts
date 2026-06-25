"use client";

import type { SharedGlobePin } from "@/lib/peer-chat/globe-pin-types";
import { mirrorSharedGlobePinToPersonalGlobe } from "@/lib/peer-chat/mirror-shared-globe-pin-to-personal";
import { EVENT_CANDIDATES_UPDATED } from "@/lib/life-read-model";

const MIRRORED_PIN_IDS_KEY = "rimvio:mirrored-shared-globe-pin-ids";
const MAX_TRACKED = 400;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readMirroredPinIds(): Set<string> {
  if (!canUseStorage()) {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(MIRRORED_PIN_IDS_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((row): row is string => typeof row === "string"));
  } catch {
    return new Set();
  }
}

function writeMirroredPinIds(ids: ReadonlySet<string>): void {
  if (!canUseStorage()) {
    return;
  }
  const list = [...ids].slice(-MAX_TRACKED);
  localStorage.setItem(MIRRORED_PIN_IDS_KEY, JSON.stringify(list));
}

/** Recipient — friend DM globe pin → private map pin (idempotent). */
export function mirrorInboundSharedGlobePinIfNeeded(input: {
  pin: SharedGlobePin;
  viewerUserId: string;
  peerDisplayName?: string | null;
}): boolean {
  const pinId = input.pin.payload.pinId.trim();
  if (!pinId) {
    return false;
  }
  if (input.pin.senderUserId === input.viewerUserId) {
    return false;
  }

  const mirrored = readMirroredPinIds();
  if (mirrored.has(pinId)) {
    return false;
  }

  mirrorSharedGlobePinToPersonalGlobe({
    payload: input.pin.payload,
    peerThreadId: input.pin.peerThreadId,
    peerDisplayName: input.peerDisplayName,
  });

  mirrored.add(pinId);
  writeMirroredPinIds(mirrored);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_CANDIDATES_UPDATED));
  }
  return true;
}

export function mirrorInboundSharedGlobePinsIfNeeded(input: {
  pins: readonly SharedGlobePin[];
  viewerUserId: string;
  peerDisplayName?: string | null;
}): number {
  let mirrored = 0;
  for (const pin of input.pins) {
    if (
      mirrorInboundSharedGlobePinIfNeeded({
        pin,
        viewerUserId: input.viewerUserId,
        peerDisplayName: input.peerDisplayName,
      })
    ) {
      mirrored += 1;
    }
  }
  return mirrored;
}
