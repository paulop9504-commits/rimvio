import {
  DEFAULT_OPERATOR_MODEL_ID,
  getOperatorModelById,
  resolveAutoOperatorModel,
  type OperatorModelDefinition,
  type OperatorModelId,
  type OperatorModelProvider,
} from "@/lib/hub/dev/operator-model-registry";

const MODEL_KEY = "rimvio-hub-operator-model";
const AUTO_KEY = "rimvio-hub-operator-model-auto";

export type OperatorModelPreference = {
  readonly modelId: OperatorModelId;
  readonly auto: boolean;
};

export function readOperatorModelPreference(): OperatorModelPreference {
  if (typeof window === "undefined") {
    return { modelId: DEFAULT_OPERATOR_MODEL_ID, auto: true };
  }

  const storedId = window.localStorage.getItem(MODEL_KEY);
  const model = getOperatorModelById(storedId ?? "");
  const autoRaw = window.localStorage.getItem(AUTO_KEY);

  return {
    modelId: (model?.id ?? DEFAULT_OPERATOR_MODEL_ID) as OperatorModelId,
    auto: autoRaw == null ? true : autoRaw === "1",
  };
}

export function writeOperatorModelPreference(preference: OperatorModelPreference): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODEL_KEY, preference.modelId);
  window.localStorage.setItem(AUTO_KEY, preference.auto ? "1" : "0");
}

export function resolveActiveOperatorModel(input: {
  preference: OperatorModelPreference;
  configured: Partial<Record<OperatorModelProvider, boolean>>;
}): OperatorModelDefinition {
  if (input.preference.auto) {
    return resolveAutoOperatorModel(input.configured);
  }
  return getOperatorModelById(input.preference.modelId) ?? resolveAutoOperatorModel(input.configured);
}

export const OPERATOR_MODEL_PREFERENCE_EVENT = "rimvio:operator-model-preference";

export function emitOperatorModelPreferenceChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPERATOR_MODEL_PREFERENCE_EVENT));
}

const SESSION_ACTIVE_KEY = "rimvio-hub-operator-active-model";

export type ActiveOperatorModelSession = {
  readonly id: string;
  readonly label: string;
  readonly provider: OperatorModelProvider;
};

export function writeActiveOperatorModelSession(model: OperatorModelDefinition): void {
  if (typeof window === "undefined") return;
  const payload: ActiveOperatorModelSession = {
    id: model.id,
    label: model.label,
    provider: model.provider,
  };
  window.sessionStorage.setItem(SESSION_ACTIVE_KEY, JSON.stringify(payload));
}

export function readActiveOperatorModelSession(): ActiveOperatorModelSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_ACTIVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveOperatorModelSession;
  } catch {
    return null;
  }
}
