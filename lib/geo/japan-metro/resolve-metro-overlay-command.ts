/**
 * NL → Japan nationwide subway overlay (2D Workspace only).
 * 「일본 지하철」「도쿄 메트로」「긴자선 보여줘」…
 */

import {
  getJapanMetroLineEntry,
  resolveJapanMetroCityLineIds,
  resolveJapanMetroLineIdFromText,
  type JapanMetroLineId,
} from "@/lib/geo/japan-metro/line-catalog";
import { applyJapanMetroOverlayCommand } from "@/lib/geo/japan-metro/metro-overlay-store";

export type JapanMetroOverlayCommand =
  | {
      readonly op: "show";
      readonly lineId: JapanMetroLineId;
    }
  | {
      readonly op: "hide";
      readonly lineId: JapanMetroLineId;
    }
  | {
      readonly op: "show_set";
      readonly lineIds: readonly JapanMetroLineId[];
      readonly cityLabelKo?: string;
    }
  | { readonly op: "show_all" }
  | { readonly op: "hide_all" };

const SHOW_RE =
  /표시|보여|켜|그려|띄워|올려|켜줘|보여줘|표시해|보여바|켜바|그려바|띄워바|해바|해봐|해죠|해줘|깔아|깔어|깔아줘/iu;
const HIDE_RE =
  /숨겨|꺼|지워|끄|숨김|없애|가려|꺼줘|숨겨바|꺼바|지워바/iu;
const ALL_RE =
  /일본\s*전국\s*지하철|일본\s*지하철|전국\s*지하철|japan\s*subway|japan\s*metro|japanese\s*subway|일본\s*메트로\s*전체|지하철\s*전국/iu;
const HINT_RE =
  /일본\s*지하철|전국\s*지하철|도쿄\s*메트로|도쿄\s*지하철|오사카\s*지하철|나고야\s*지하철|교토\s*지하철|고베\s*지하철|후쿠오카\s*지하철|센다이\s*지하철|삿포로\s*지하철|요코하마\s*지하철|도에이|긴자선|마루노우치|히비야|치요다|유라쿠초|한조몬|난보쿠|후쿠토신|오에도|japan\s*subway|japan\s*metro/iu;

export function resolveJapanMetroOverlayCommand(
  text: string,
): JapanMetroOverlayCommand | null {
  const t = text.trim().replace(/\s+/gu, " ");
  if (!t) return null;

  const wantsHide = HIDE_RE.test(t);
  const wantsShow = SHOW_RE.test(t);
  const wantsAll = ALL_RE.test(t);
  const hasHint = HINT_RE.test(t);

  if (wantsAll) {
    return wantsHide ? { op: "hide_all" } : { op: "show_all" };
  }

  if (/일본\s*지하철\s*노선|전국\s*지하철\s*노선|일본\s*메트로\s*노선/iu.test(t)) {
    return wantsHide ? { op: "hide_all" } : { op: "show_all" };
  }

  const cityLines = resolveJapanMetroCityLineIds(t);
  if (cityLines && cityLines.length > 0) {
    if (wantsHide) return { op: "hide_all" };
    const cityLabelKo =
      getJapanMetroLineEntry(cityLines[0]!)?.cityKo ?? "지하철";
    return {
      op: "show_set",
      lineIds: cityLines,
      cityLabelKo: `${cityLabelKo} 지하철`,
    };
  }

  const lineId = resolveJapanMetroLineIdFromText(t);
  if (!lineId) {
    if (hasHint && (wantsShow || wantsHide)) {
      return wantsHide ? { op: "hide_all" } : { op: "show_all" };
    }
    return null;
  }

  if (wantsHide) return { op: "hide", lineId };
  if (wantsShow || hasHint || /선|metro|subway/iu.test(t)) {
    return { op: "show", lineId };
  }
  return null;
}

export function japanMetroOverlayStatusKo(
  cmd: JapanMetroOverlayCommand,
): string {
  if (cmd.op === "show_all") return "일본 전국 지하철 표시";
  if (cmd.op === "hide_all") return "일본 지하철 숨김";
  if (cmd.op === "show_set") {
    return `${cmd.cityLabelKo ?? "지하철"} 표시`;
  }
  const label = getJapanMetroLineEntry(cmd.lineId)?.labelKo ?? cmd.lineId;
  return cmd.op === "show" ? `${label} 표시` : `${label} 숨김`;
}

export function tryApplyJapanMetroOverlayFromUtterance(
  text: string,
): string | null {
  const cmd = resolveJapanMetroOverlayCommand(text);
  if (!cmd) return null;
  applyJapanMetroOverlayCommand(cmd);
  return japanMetroOverlayStatusKo(cmd);
}
