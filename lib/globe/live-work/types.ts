export type LiveWorkPhase =
  | "running"
  | "needs_approval"
  | "waiting_pc"
  | "done"
  | "stopped";
export type LiveWorkKind = "pc_execution" | "workspace";

export type LiveWork = {
  readonly id: string;
  readonly contextEventId: string;
  readonly kind: LiveWorkKind;
  readonly title: string;
  readonly glyph: string;
  readonly phase: LiveWorkPhase;
  readonly statusLine: string;
  readonly pcTaskId: string | null;
  readonly deviceName: string | null;
  readonly latestEvent?: string | null;
  readonly screenshotJpeg?: string | null;
  readonly executionPhase?: string | null;
  readonly updatedAtIso: string;
  readonly completedAtIso: string | null;
};

/** Done items stay in 최근 with a check, then fold into ordinary history. */
export const LIVE_WORK_RECENT_HIGHLIGHT_MS = 45 * 60 * 1000;
export const LIVE_WORK_UPDATED = "rimvio:live-work-updated";
export const LIVE_WORK_OPEN_CHAT = "rimvio:live-work-open-chat";
