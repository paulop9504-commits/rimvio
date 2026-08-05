/**
 * NL → Korea national rail overlay (2D Workspace only).
 * 「전국 노선도」「KTX 경부선 보여줘」…
 */

import {
  getKoreaRailLineEntry,
  resolveKoreaRailLineIdFromText,
  type KoreaRailLineId,
} from "@/lib/geo/korea-rail/line-catalog";
import { applyKoreaRailOverlayCommand } from "@/lib/geo/korea-rail/rail-overlay-store";

export type KoreaRailOverlayCommand =
  | {
      readonly op: "show";
      readonly lineId: KoreaRailLineId;
    }
  | {
      readonly op: "hide";
      readonly lineId: KoreaRailLineId;
    }
  | { readonly op: "show_all" }
  | { readonly op: "hide_all" };

const SHOW_RE =
  /표시|보여|켜|그려|띄워|올려|켜줘|보여줘|표시해|보여바|켜바|그려바|띄워바|해바|해봐|해죠|해줘|깔아|깔어|깔아줘/iu;
const HIDE_RE =
  /숨겨|꺼|지워|끄|숨김|없애|가려|꺼줘|숨겨바|꺼바|지워바/iu;
const ALL_RE =
  /전국\s*노선|한국\s*노선|코레일\s*노선|전국\s*철도|한국\s*철도|기차\s*노선|KTX\s*노선|SRT\s*노선|철도\s*노선|전국\s*선로|한반도\s*노선|korea\s*rail|national\s*rail/iu;
const RAIL_HINT_RE =
  /전국\s*노선|한국\s*노선|코레일|KTX|SRT|경부선|호남선|전라선|중앙선|영동선|동해선|장항선|강릉선|경전선|철도|기차\s*노선|노선도|korea\s*rail|korail/iu;

/**
 * Parse Korea rail overlay from Workspace / Globe prompt text.
 * Returns null when not a Korea rail command (does not steal Osaka metro).
 */
export function resolveKoreaRailOverlayCommand(
  text: string,
): KoreaRailOverlayCommand | null {
  const t = text.trim().replace(/\s+/gu, " ");
  if (!t) return null;

  const lineId = resolveKoreaRailLineIdFromText(t);
  const wantsAll = ALL_RE.test(t);
  const wantsHide = HIDE_RE.test(t);
  const wantsShow = SHOW_RE.test(t);
  const hasHint = RAIL_HINT_RE.test(t);

  if (wantsAll) {
    if (wantsHide) return { op: "hide_all" };
    return { op: "show_all" };
  }

  // 「전국 노선도」 alone = show all
  if (
    /전국\s*노선도|한국\s*노선도|코레일\s*노선도|철도\s*노선도/iu.test(t)
  ) {
    return wantsHide ? { op: "hide_all" } : { op: "show_all" };
  }

  if (!lineId) {
    if (hasHint && (wantsShow || wantsHide)) {
      return wantsHide ? { op: "hide_all" } : { op: "show_all" };
    }
    return null;
  }

  // Bare line name without show/hide — still show that corridor
  // (「KTX 경부선」) when rail-flavored; hide only with hide verb.
  if (wantsHide) return { op: "hide", lineId };
  if (wantsShow || hasHint || /선|KTX|SRT/iu.test(t)) {
    return { op: "show", lineId };
  }

  return null;
}

export function koreaRailOverlayStatusKo(
  cmd: KoreaRailOverlayCommand,
): string {
  if (cmd.op === "show_all") return "전국 노선도 표시";
  if (cmd.op === "hide_all") return "전국 노선도 숨김";
  const label = getKoreaRailLineEntry(cmd.lineId)?.labelKo ?? cmd.lineId;
  return cmd.op === "show" ? `${label} 표시` : `${label} 숨김`;
}

export function tryApplyKoreaRailOverlayFromUtterance(
  text: string,
): string | null {
  const cmd = resolveKoreaRailOverlayCommand(text);
  if (!cmd) return null;
  applyKoreaRailOverlayCommand(cmd);
  return koreaRailOverlayStatusKo(cmd);
}
