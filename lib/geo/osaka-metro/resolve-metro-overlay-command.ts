/**
 * NL → Osaka Metro overlay command (2D Workspace only).
 * Colloquial KO: 해바 / 해봐 / 켜바 / 보여줘바 …
 */

import {
  getOsakaMetroLineEntry,
  resolveOsakaMetroLineIdFromText,
  type OsakaMetroLineId,
} from "@/lib/geo/osaka-metro/line-catalog";
import { applyOsakaMetroOverlayCommand } from "@/lib/geo/osaka-metro/metro-overlay-store";

export type OsakaMetroOverlayCommand =
  | {
      readonly op: "show";
      readonly lineId: OsakaMetroLineId;
    }
  | {
      readonly op: "hide";
      readonly lineId: OsakaMetroLineId;
    }
  | { readonly op: "show_all" }
  | { readonly op: "hide_all" };

const SHOW_RE =
  /표시|보여|켜|그려|띄워|올려|켜줘|보여줘|표시해|보여바|켜바|그려바|띄워바|해바|해봐|해죠|해줘/iu;
const HIDE_RE =
  /숨겨|꺼|지워|끄|숨김|없애|가려|꺼줘|숨겨바|꺼바|지워바/iu;
const ALL_RE =
  /전체\s*노선|메트로\s*전부|지하철\s*전부|모든\s*노선|전체\s*메트로|노선\s*전부|노선망|지하철\s*노선|메트로\s*노선|오사카\s*메트로|지하철선|전부\s*표시|다\s*보여|다\s*표시/iu;
const METRO_HINT_RE =
  /메트로|지하철|노선|노선망|라인|line|subway|metro|jr|유메사키|사쿠라지마|桜島|夢咲|유니버설\s*시티|유니버셜\s*시티|御堂筋|谷町|四つ橋|中央|千日前|堺筋|長堀|今里|南港|미도스지|다니마치|요쓰바시|요츠바시|주오선|센니치|사카이스지|나가호리|이마자토|난코/iu;

/**
 * Parse overlay toggle from Workspace command text.
 * Returns null when utterance is not a metro overlay command.
 */
export function resolveOsakaMetroOverlayCommand(
  text: string,
): OsakaMetroOverlayCommand | null {
  const t = text.trim().replace(/\s+/gu, " ");
  if (!t) return null;

  const lineId = resolveOsakaMetroLineIdFromText(t);
  const wantsAll = ALL_RE.test(t);
  const wantsHide = HIDE_RE.test(t);
  const wantsShow = SHOW_RE.test(t);

  // 「지하철 노선 전부 표시해바」 / 「메트로 전부」
  if (wantsAll || (METRO_HINT_RE.test(t) && /전부|전체|다\s/u.test(t))) {
    if (wantsHide) return { op: "hide_all" };
    if (wantsShow || wantsAll || METRO_HINT_RE.test(t)) {
      return { op: "show_all" };
    }
  }

  if (!lineId) {
    if (METRO_HINT_RE.test(t) && (wantsShow || wantsHide)) {
      return wantsHide ? { op: "hide_all" } : { op: "show_all" };
    }
    return null;
  }

  if (wantsHide) return { op: "hide", lineId };

  // Require show verb or explicit 「선」 so 「미도스지 호텔」 is not stolen
  if (wantsShow || /선|線|\bline\b|노선/iu.test(t)) {
    return { op: "show", lineId };
  }

  return null;
}

/** One-line toast status (L1 KO). */
export function osakaMetroOverlayStatusKo(
  cmd: OsakaMetroOverlayCommand,
): string {
  if (cmd.op === "show_all") return "오사카 메트로·JR 노선 표시";
  if (cmd.op === "hide_all") return "오사카 메트로·JR 노선 숨김";
  const label = getOsakaMetroLineEntry(cmd.lineId)?.labelKo ?? cmd.lineId;
  return cmd.op === "show" ? `${label} 표시` : `${label} 숨김`;
}

/**
 * Apply metro overlay from any NL ingress.
 * Returns status when handled; null when not a metro command.
 */
export function tryApplyOsakaMetroOverlayFromUtterance(
  text: string,
): string | null {
  const cmd = resolveOsakaMetroOverlayCommand(text);
  if (!cmd) return null;
  applyOsakaMetroOverlayCommand(cmd);
  return osakaMetroOverlayStatusKo(cmd);
}
