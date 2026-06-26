"use client";

const STORAGE_KEY = "rimvio.globe-resume.v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3;

export type GlobeResumeSessionKind = "context" | "market" | "photo";

export type GlobeResumeSession = {
  eventId: string;
  title: string;
  placeLabel?: string | null;
  kind: GlobeResumeSessionKind;
  updatedAtIso: string;
};

export function writeGlobeResumeSession(input: {
  eventId: string;
  title: string;
  placeLabel?: string | null;
  kind: GlobeResumeSessionKind;
}): void {
  const eventId = input.eventId.trim();
  if (!eventId || typeof window === "undefined") {
    return;
  }
  const payload: GlobeResumeSession = {
    eventId,
    title: input.title.trim() || "맥락",
    placeLabel: input.placeLabel?.trim() || null,
    kind: input.kind,
    updatedAtIso: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Non-blocking.
  }
}

export function readGlobeResumeSession(nowMs = Date.now()): GlobeResumeSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as GlobeResumeSession;
    if (!parsed?.eventId?.trim() || !parsed.updatedAtIso) {
      return null;
    }
    const age = nowMs - Date.parse(parsed.updatedAtIso);
    if (!Number.isFinite(age) || age > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGlobeResumeSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
