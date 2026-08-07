/**
 * Active Workspace destination vs utterance destination — ADR-029 companion.
 * 「오키나와 여행지」must not refine an open「오사카」hub.
 */

import { extractTravelDestination } from "@/lib/experience-run/extract-travel-destination";
import { readContextWorkspace } from "@/lib/context-workspace/workspace-store";

/** Collapse aliases so Osaka/오사카 and Okinawa/나하 compare reliably. */
export function normalizeDestinationKey(label: string): string {
  let t = label.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return "";
  t = t.replace(/도$/u, "");
  const aliases: Record<string, string> = {
    osaka: "오사카",
    오사카: "오사카",
    tokyo: "도쿄",
    도쿄: "도쿄",
    東京: "도쿄",
    kyoto: "교토",
    교토: "교토",
    fukuoka: "후쿠오카",
    후쿠오카: "후쿠오카",
    sapporo: "삿포로",
    삿포로: "삿포로",
    nagoya: "나고야",
    나고야: "나고야",
    okinawa: "오키나와",
    오키나와: "오키나와",
    naha: "오키나와",
    나하: "오키나와",
    jeju: "제주",
    제주: "제주",
    hawaii: "하와이",
    하와이: "하와이",
    guam: "괌",
    괌: "괌",
    saipan: "사이판",
    사이판: "사이판",
    bali: "발리",
    발리: "발리",
  };
  return aliases[t] ?? t;
}

export function destinationsMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = a?.trim() ? normalizeDestinationKey(a) : "";
  const nb = b?.trim() ? normalizeDestinationKey(b) : "";
  if (!na || !nb) return false;
  return na === nb;
}

/** Destination stamped on the open provisional Workspace, if any. */
export function readActiveWorkspaceDestinationKo(
  contextEventId: string | null | undefined,
): string | null {
  const id = contextEventId?.trim();
  if (!id) return null;
  const ws = readContextWorkspace(id);
  if (!ws) return null;
  const stamped =
    ws.constraintMemory?.destinationKo?.trim() ||
    ws.realityDraft?.destinationKo?.trim() ||
    null;
  if (stamped) return stamped;
  // Fallback — Continuum often mirrors dest into summary/query before memory bag.
  return (
    extractTravelDestination(ws.summaryKo ?? "") ||
    extractTravelDestination(ws.query ?? "") ||
    null
  );
}

/**
 * True when the utterance names a travel destination that differs from the
 * active Workspace hub destination (e.g. Okinawa NL on Osaka Context).
 */
export function utteranceConflictsActiveDestination(input: {
  readonly utterance: string;
  readonly activeContextEventId?: string | null;
  /** Override when workspace store is not stamped yet (tests). */
  readonly activeDestinationKo?: string | null;
}): boolean {
  const uttered = extractTravelDestination(input.utterance.trim());
  if (!uttered) return false;
  const active =
    input.activeDestinationKo?.trim() ||
    readActiveWorkspaceDestinationKo(input.activeContextEventId);
  if (!active) return false;
  return !destinationsMatch(uttered, active);
}
