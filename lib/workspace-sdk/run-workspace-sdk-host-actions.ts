/**
 * Workspace SDK Host actions — Action / Focus advance / Commit → Field.
 */

import { runBookingPrepareAgent } from "@/lib/agent-runtime";
import { copy } from "@/lib/copy/human-ko";
import { invokeRimvioTool } from "@/lib/tool-registry";
import { openFieldDashboardIngressForced } from "@/lib/nav/field-dashboard-ingress";
import {
  advanceWorkspaceFocus,
  buildWorkspaceFocusSurface,
} from "@/lib/workspace-kind/build-workspace-focus-surface";
import { workspaceKindTemplate } from "@/lib/workspace-kind/templates";
import type { WorkspaceKind } from "@/lib/workspace-kind/types";
import { advanceContextRealityFocus } from "@/lib/reality-os";
import { buildWorkspaceSdkFrame } from "@/lib/workspace-sdk/build-workspace-sdk-frame";
import type { WorkspaceSdkFrame } from "@/lib/workspace-sdk/types";
import { writeWorkspaceSdkSession } from "@/lib/workspace-sdk/workspace-sdk-session-store";

export type WorkspaceSdkHostActionResult =
  | {
      readonly ok: true;
      readonly frame: WorkspaceSdkFrame;
      readonly toastKo: string;
      readonly mapsUrl?: string | null;
      readonly openedField?: boolean;
      readonly suggestCommit?: boolean;
    }
  | { readonly ok: false; readonly reasonKo: string };

function kindFromFrame(frame: WorkspaceSdkFrame): WorkspaceKind | null {
  if (
    frame.kind === "travel" ||
    frame.kind === "driver" ||
    frame.kind === "used_goods"
  ) {
    return frame.kind;
  }
  return null;
}

export function runWorkspaceSdkAction(input: {
  readonly frame: WorkspaceSdkFrame;
  readonly placeId?: string | null;
  readonly placeName?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly nodeKind?: "lodging" | "eatery" | "activity";
}): WorkspaceSdkHostActionResult {
  const ctx = input.frame.contextEventId?.trim() ?? "";
  if (!ctx) {
    return { ok: false, reasonKo: "맥락이 없어요" };
  }

  if (input.frame.action.toolId === "booking.prepare") {
    const placeName = input.placeName?.trim();
    const placeId = input.placeId?.trim();
    if (!placeName || !placeId) {
      return { ok: false, reasonKo: "먼저 숙소를 골라 주세요" };
    }
    const prepared = runBookingPrepareAgent({
      contextEventId: ctx,
      placeId,
      placeName,
      kind: input.nodeKind ?? "lodging",
      lat: input.lat,
      lng: input.lng,
      contextLabelKo: input.frame.header.titleKo,
    });
    if (!prepared.ok) {
      return { ok: false, reasonKo: prepared.reasonKo };
    }
    const next: WorkspaceSdkFrame = {
      ...input.frame,
      lifecycle: "action_ready",
      ai: {
        ...input.frame.ai,
        stripHintKo: copy.globe.workspaceSdkActionReadyHint(placeName),
      },
      commit: {
        ...input.frame.commit,
        labelKo: copy.globe.workspaceSdkCommitPrimary,
      },
    };
    writeWorkspaceSdkSession(next);
    return {
      ok: true,
      frame: next,
      toastKo: `${placeName} · 결재함에 담았어요 · ${next.commit.labelKo}`,
      openedField: false,
      suggestCommit: true,
    };
  }

  if (input.frame.action.toolId === "maps.navigate") {
    const lat = input.lat;
    const lng = input.lng;
    const label = input.placeName?.trim() || "목적지";
    if (lat == null || lng == null) {
      return { ok: false, reasonKo: "길찾을 위치가 없어요" };
    }
    const tool = invokeRimvioTool("maps.navigate", {
      lat,
      lng,
      placeName: label,
      utterance: "길 찾아줘",
    });
    const mapsUrl = tool.mapsUrl?.trim() || null;
    if (!mapsUrl) {
      return { ok: false, reasonKo: "길을 열 수 없어요" };
    }
    const next: WorkspaceSdkFrame = {
      ...input.frame,
      lifecycle: "action_ready",
      ai: {
        ...input.frame.ai,
        stripHintKo: tool.summaryKo,
      },
    };
    writeWorkspaceSdkSession(next);
    return { ok: true, frame: next, toastKo: tool.summaryKo, mapsUrl };
  }

  return { ok: true, frame: input.frame, toastKo: input.frame.action.labelKo };
}

/** Complete current Focus → next step (One Focus). */
export function runWorkspaceSdkFocusAdvance(input: {
  readonly frame: WorkspaceSdkFrame;
  readonly completedSlotIds?: readonly string[];
}): WorkspaceSdkHostActionResult {
  const kind = kindFromFrame(input.frame);
  if (!kind) {
    return { ok: false, reasonKo: "이 작업장은 Focus 진행을 아직 지원하지 않아요" };
  }
  const completed = [
    ...(input.completedSlotIds ?? []),
    input.frame.primaryFocus.slotId,
  ];
  const focus = advanceWorkspaceFocus({ kind, completedSlotIds: completed });
  const ctx = input.frame.contextEventId?.trim() ?? "";
  if (ctx) {
    advanceContextRealityFocus({
      contextEventId: ctx,
      completedSlotId: input.frame.primaryFocus.slotId,
      nextSlotId: focus?.focusSlotId ?? null,
    });
  }
  if (!focus) {
    const done = buildWorkspaceSdkFrame({
      kind: input.frame.kind,
      headerTitleKo: input.frame.header.titleKo,
      contextEventId: input.frame.contextEventId,
      focusSlotId: input.frame.primaryFocus.slotId,
      focusLabelKo: input.frame.primaryFocus.labelKo,
      aiStripHintKo: "준비 스텝을 모두 마쳤어요 · 결재함에서 반영하세요",
      lifecycle: "awaiting_commit",
    });
    writeWorkspaceSdkSession(done);
    return {
      ok: true,
      frame: done,
      toastKo: "다음 할 일이 없어요 · 결재로 이어가요",
    };
  }

  const recipeFocus =
    workspaceKindTemplate(kind).slots.find((s) => s.id === focus.focusSlotId)
      ?.labelKo ?? focus.focusLabelKo;

  const next = buildWorkspaceSdkFrame({
    kind: input.frame.kind,
    headerTitleKo: input.frame.header.titleKo,
    contextEventId: input.frame.contextEventId,
    focusSlotId: focus.focusSlotId,
    focusLabelKo: recipeFocus,
    aiStripHintKo: focus.askKo,
    lifecycle: "focused",
  });
  writeWorkspaceSdkSession(next);
  return {
    ok: true,
    frame: next,
    toastKo: focus.headlineKo,
  };
}

/** Commit region → Field 결재함 (human). */
export function runWorkspaceSdkCommit(input: {
  readonly frame: WorkspaceSdkFrame;
}): WorkspaceSdkHostActionResult {
  const ctx = input.frame.contextEventId?.trim() ?? "";
  const next: WorkspaceSdkFrame = {
    ...input.frame,
    lifecycle: "awaiting_commit",
    ai: {
      ...input.frame.ai,
      stripHintKo: "결재함에서 승인하면 반영돼요",
    },
  };
  writeWorkspaceSdkSession(next);
  openFieldDashboardIngressForced({
    tab: "queue",
    primaryEventId: ctx || null,
  });
  return {
    ok: true,
    frame: next,
    toastKo: next.ai.stripHintKo ?? input.frame.commit.labelKo,
    openedField: true,
  };
}

export function readFocusGhostLines(frame: WorkspaceSdkFrame): readonly string[] {
  const kind = kindFromFrame(frame);
  if (!kind) {
    return [];
  }
  const surface = buildWorkspaceFocusSurface({
    kind,
    focusSlotId: frame.primaryFocus.slotId,
    backgroundSlotIds: kind === "travel" ? ["budget"] : [],
  });
  return surface.ghostRows.map((row) => row.lineKo);
}
