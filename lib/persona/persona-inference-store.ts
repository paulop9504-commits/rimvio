import {
  PERSONA_INFERENCE_STORAGE_KEY,
  PERSONA_INFERENCE_UPDATED,
  type PersonaAxisId,
  type PersonaSignal,
} from "@/lib/persona/types";

type InferenceSnapshot = {
  version: 1;
  signals: PersonaSignal[];
};

function emptySnapshot(): InferenceSnapshot {
  return { version: 1, signals: [] };
}

function readSnapshot(): InferenceSnapshot {
  if (typeof window === "undefined") {
    return emptySnapshot();
  }
  try {
    const raw = window.localStorage.getItem(PERSONA_INFERENCE_STORAGE_KEY);
    if (!raw) {
      return emptySnapshot();
    }
    const parsed = JSON.parse(raw) as InferenceSnapshot;
    if (!Array.isArray(parsed.signals)) {
      return emptySnapshot();
    }
    return { version: 1, signals: parsed.signals };
  } catch {
    return emptySnapshot();
  }
}

function writeSnapshot(snapshot: InferenceSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      PERSONA_INFERENCE_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
    window.dispatchEvent(new CustomEvent(PERSONA_INFERENCE_UPDATED));
  } catch {
    // quota / private mode
  }
}

export function listPersonaSignals(): PersonaSignal[] {
  return [...readSnapshot().signals].sort((a, b) =>
    b.atIso.localeCompare(a.atIso),
  );
}

export function findLatestPersonaSignal(
  axisId: PersonaAxisId,
): PersonaSignal | null {
  return listPersonaSignals().find((row) => row.axisId === axisId) ?? null;
}

export function recordPersonaSignal(
  input: Omit<PersonaSignal, "id" | "atIso"> & {
    id?: string;
    atIso?: string;
  },
): PersonaSignal {
  const signal: PersonaSignal = {
    id: input.id ?? `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    axisId: input.axisId,
    value: input.value,
    labelKo: input.labelKo,
    source: input.source,
    eventId: input.eventId ?? null,
    atIso: input.atIso ?? new Date().toISOString(),
  };

  const snapshot = readSnapshot();
  const withoutAxis = snapshot.signals.filter(
    (row) => !(row.axisId === signal.axisId && row.eventId === signal.eventId),
  );
  writeSnapshot({
    version: 1,
    signals: [signal, ...withoutAxis].slice(0, 80),
  });
  return signal;
}

export function removePersonaSignal(id: string): void {
  const snapshot = readSnapshot();
  writeSnapshot({
    version: 1,
    signals: snapshot.signals.filter((row) => row.id !== id),
  });
}

export function resetPersonaInference(): void {
  writeSnapshot(emptySnapshot());
}

export function subscribePersonaInference(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  window.addEventListener(PERSONA_INFERENCE_UPDATED, listener);
  return () => window.removeEventListener(PERSONA_INFERENCE_UPDATED, listener);
}
