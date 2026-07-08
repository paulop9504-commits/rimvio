/**
 * Scout contract session — one active scout per context event.
 * @see docs/RIMVIO_CONTRACT_SCHEMA.md
 */

import type {
  ScoutContract,
  ScoutContractAnchorRef,
} from "@/lib/globe/contracts/scout-contract";

const STORAGE_PREFIX = "rimvio.scout-contract.";
const SELECTED_PREFIX = "rimvio.scout-selected-anchor.";

export type ScoutSelectedAnchorWire = ScoutContractAnchorRef & {
  readonly contextEventId: string;
  readonly updatedAtIso: string;
};

function emit(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("rimvio:scout-contract", {
      detail: { contextEventId },
    }),
  );
}

export function readScoutContract(
  contextEventId: string,
): ScoutContract | null {
  if (typeof window === "undefined") {
    return null;
  }
  const key = contextEventId.trim();
  if (!key) {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ScoutContract;
    if (parsed?.contract_type !== "scout" || !parsed.contractId?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeScoutContract(
  contextEventId: string,
  contract: ScoutContract,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(contract));
    emit(key);
  } catch {
    // ignore quota
  }
}

export function clearScoutContract(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    emit(key);
  } catch {
    // ignore
  }
}

export function readScoutSelectedAnchor(
  contextEventId: string,
): ScoutSelectedAnchorWire | null {
  if (typeof window === "undefined") {
    return null;
  }
  const key = contextEventId.trim();
  if (!key) {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(`${SELECTED_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ScoutSelectedAnchorWire;
    if (!parsed?.placeId?.trim() || !Number.isFinite(parsed.lat)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeScoutSelectedAnchor(
  contextEventId: string,
  anchor: ScoutContractAnchorRef,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  const wire: ScoutSelectedAnchorWire = {
    ...anchor,
    contextEventId: key,
    updatedAtIso: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(`${SELECTED_PREFIX}${key}`, JSON.stringify(wire));
    emit(key);
  } catch {
    // ignore
  }
}

export function clearScoutSelectedAnchor(contextEventId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const key = contextEventId.trim();
  if (!key) {
    return;
  }
  try {
    sessionStorage.removeItem(`${SELECTED_PREFIX}${key}`);
    emit(key);
  } catch {
    // ignore
  }
}
