/**
 * Cross-Context Memory — preferences learned from one context apply to others.
 * e.g. "오사카에서 저렴한 숙소 선호" → 제주 여행에서도 자동 적용.
 */

import type { CrossContextPreference } from "@/lib/reality-memory/types";

const STORAGE_KEY = "rimvio.cross-context-prefs.v1";

function readAll(): CrossContextPreference[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CrossContextPreference[]) : [];
  } catch {
    return [];
  }
}

function writeAll(prefs: CrossContextPreference[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* quota */ }
}

export function learnPreference(input: {
  domain: string;
  key: string;
  value: string;
  sourceContextId: string;
}): CrossContextPreference {
  const all = readAll();
  const existing = all.find((p) => p.domain === input.domain && p.key === input.key);

  if (existing) {
    const updated: CrossContextPreference = {
      ...existing,
      value: input.value,
      learnedFrom: [...new Set([...existing.learnedFrom, input.sourceContextId])],
      confidence: Math.min(1, existing.confidence + 0.1),
    };
    const filtered = all.filter((p) => p.preferenceId !== existing.preferenceId);
    filtered.push(updated);
    writeAll(filtered);
    return updated;
  }

  const pref: CrossContextPreference = {
    preferenceId: `pref-${Date.now()}`,
    domain: input.domain,
    key: input.key,
    value: input.value,
    learnedFrom: [input.sourceContextId],
    confidence: 0.5,
  };
  all.push(pref);
  writeAll(all);
  return pref;
}

export function queryPreferences(domain?: string): readonly CrossContextPreference[] {
  const all = readAll();
  if (!domain) return all;
  return all.filter((p) => p.domain === domain);
}

export function getPreference(domain: string, key: string): CrossContextPreference | null {
  const all = readAll();
  return all.find((p) => p.domain === domain && p.key === key) ?? null;
}

export function clearPreferences(): void {
  writeAll([]);
}
