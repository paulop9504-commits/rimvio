import { travelProfileForMessage } from "@/lib/experience-run/travel-context-slots";
import { detectPortalIntentFromText } from "@/lib/portal/detect-portal-intent-from-text";
import type {
  GlobeWorkSurface,
  WorkQueueItemKind,
} from "@/lib/work-queue/work-queue-types";

export type GlobeWorkSurfaceClassification = {
  surface: GlobeWorkSurface;
  kind: WorkQueueItemKind;
  labelKo: string;
  reasonKo: string;
};

/** Deterministic — inner (내 지구) vs outer (밖 지구) before slot collect. */
export function classifyGlobeWorkSurface(
  message: string,
): GlobeWorkSurfaceClassification | null {
  const text = message.trim();
  if (!text) {
    return null;
  }

  const portal = detectPortalIntentFromText(text);
  if (portal) {
    const selling = portal.intentId === "offer";
    const seeking = portal.intentId === "seek";
    return {
      surface: "outer",
      kind: "portal_compose",
      labelKo: selling ? "내놓기" : seeking ? "구하기" : "밖 지구",
      reasonKo: selling
        ? "밖 지구에 올릴 내놓기로 이어갈게요"
        : seeking
          ? "밖 지구에서 구하기로 이어갈게요"
          : "밖 지구에서 함께하기로 이어갈게요",
    };
  }

  if (travelProfileForMessage(text)) {
    return {
      surface: "inner",
      kind: "travel_context",
      labelKo: "여행 맥락",
      reasonKo: "내 지구에 맥락을 만들게요",
    };
  }

  return {
    surface: "inner",
    kind: "personal_capture",
    labelKo: "맥락",
    reasonKo: "내 지구에 남길 맥락으로 이어갈게요",
  };
}
