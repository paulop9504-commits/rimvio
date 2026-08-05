/**
 * NL → Japan Shinkansen overlay (2D Workspace only).
 * 「신칸센 노선도」「도카이도신칸센 보여줘」…
 */

import {
  getJapanShinkansenLineEntry,
  resolveJapanShinkansenLineIdFromText,
  type JapanShinkansenLineId,
} from "@/lib/geo/japan-shinkansen/line-catalog";
import { applyJapanShinkansenOverlayCommand } from "@/lib/geo/japan-shinkansen/shinkansen-overlay-store";

export type JapanShinkansenOverlayCommand =
  | {
      readonly op: "show";
      readonly lineId: JapanShinkansenLineId;
    }
  | {
      readonly op: "hide";
      readonly lineId: JapanShinkansenLineId;
    }
  | { readonly op: "show_all" }
  | { readonly op: "hide_all" };

const SHOW_RE =
  /표시|보여|켜|그려|띄워|올려|켜줘|보여줘|표시해|보여바|켜바|그려바|띄워바|해바|해봐|해죠|해줘|깔아|깔어|깔아줘|깔아놔|깔아라/iu;
const HIDE_RE =
  /숨겨|꺼|지워|끄|숨김|없애|가려|꺼줘|숨겨바|꺼바|지워바/iu;
const ALL_RE =
  /신칸센\s*노선|일본\s*신칸센|전국\s*신칸센|신칸센\s*전체|신칸센\s*노선도|shinkansen\s*(map|network|lines?)|일본\s*고속철/iu;
const HINT_RE =
  /신칸센|新幹線|shinkansen|도카이도신칸센|산요신칸센|도호쿠신칸센|조에쓰신칸센|호쿠리쿠신칸센|큐슈신칸센|규슈신칸센|홋카이도신칸센|야마가타신칸센|아키타신칸센|니시큐슈/iu;

export function resolveJapanShinkansenOverlayCommand(
  text: string,
): JapanShinkansenOverlayCommand | null {
  const t = text.trim().replace(/\s+/gu, " ");
  if (!t) return null;

  const lineId = resolveJapanShinkansenLineIdFromText(t);
  const wantsAll = ALL_RE.test(t);
  const wantsHide = HIDE_RE.test(t);
  const wantsShow = SHOW_RE.test(t);
  const hasHint = HINT_RE.test(t);

  if (wantsAll) {
    return wantsHide ? { op: "hide_all" } : { op: "show_all" };
  }

  if (/신칸센\s*노선도|일본\s*신칸센\s*노선/iu.test(t)) {
    return wantsHide ? { op: "hide_all" } : { op: "show_all" };
  }

  if (!lineId) {
    if (hasHint && (wantsShow || wantsHide)) {
      return wantsHide ? { op: "hide_all" } : { op: "show_all" };
    }
    // Bare 「신칸센」 / 「shinkansen」 → show all
    if (/^(일본\s*)?신칸센$|^shinkansen$/iu.test(t)) {
      return { op: "show_all" };
    }
    return null;
  }

  if (wantsHide) return { op: "hide", lineId };
  if (wantsShow || hasHint || /선|신칸센|shinkansen/iu.test(t)) {
    return { op: "show", lineId };
  }
  return null;
}

export function japanShinkansenOverlayStatusKo(
  cmd: JapanShinkansenOverlayCommand,
): string {
  if (cmd.op === "show_all") return "일본 신칸센 노선 표시";
  if (cmd.op === "hide_all") return "일본 신칸센 노선 숨김";
  const label =
    getJapanShinkansenLineEntry(cmd.lineId)?.labelKo ?? cmd.lineId;
  return cmd.op === "show" ? `${label} 표시` : `${label} 숨김`;
}

export function tryApplyJapanShinkansenOverlayFromUtterance(
  text: string,
): string | null {
  const cmd = resolveJapanShinkansenOverlayCommand(text);
  if (!cmd) return null;
  applyJapanShinkansenOverlayCommand(cmd);
  return japanShinkansenOverlayStatusKo(cmd);
}
