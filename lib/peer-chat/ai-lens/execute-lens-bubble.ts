import { ingestScheduleSignal } from "@/lib/events/event-ingest-pipeline";
import type { DeepLinkBubbleCandidate } from "@/lib/peer-chat/ai-lens/types";
import { recordLensBubbleClick } from "@/lib/peer-chat/ai-lens/lens-user-history";

export type LensBubbleExecuteResult = {
  ok: boolean;
  message: string;
  /** UI opens map picker — no auto navigation. */
  openMapPicker?: { place: string };
};

function resolveScheduleDatetime(payload?: {
  datetime?: string;
}): string | undefined {
  const raw = payload?.datetime?.trim();
  if (!raw) {
    return undefined;
  }
  if (raw.includes("T")) {
    return raw;
  }
  const [h, m] = raw.split(":").map((part) => Number(part));
  const date = new Date();
  date.setHours(h ?? 19, m ?? 0, 0, 0);
  if (date.getTime() < Date.now() - 60_000) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString();
}

/** User tap only — never called without explicit click. */
export function executeDeepLinkBubbleCandidate(
  candidate: DeepLinkBubbleCandidate,
  input?: { sourceMessageId?: string; peerDisplayName?: string },
): LensBubbleExecuteResult {
  recordLensBubbleClick(candidate.actionType);

  switch (candidate.actionType) {
    case "schedule":
    case "movie_schedule": {
      const payload = candidate.payload;
      const datetime = resolveScheduleDatetime(payload);
      const event = ingestScheduleSignal({
        sourceMessageId: input?.sourceMessageId,
        title: payload?.title ?? candidate.label,
        datetime,
        place: payload?.place,
        category: payload?.category === "entertainment" ? "entertainment" : "schedule",
      });
      if (!event) {
        return { ok: false, message: "일정을 만들지 못했어요" };
      }
      return {
        ok: true,
        message: `${event.title} · 일정에 넣었어요`,
      };
    }

    case "navigate": {
      const place = candidate.payload?.place?.trim();
      if (!place) {
        return { ok: false, message: "장소를 찾지 못했어요" };
      }
      return {
        ok: true,
        message: `${place} · 지도 선택`,
        openMapPicker: { place },
      };
    }

    case "transfer":
      return {
        ok: true,
        message: "송금은 뱅킹 앱에서 직접 확인해 주세요 (자동 송금 안 함)",
      };

    case "save_resource": {
      const url = candidate.payload?.url;
      if (!url) {
        return { ok: false, message: "링크가 없어요" };
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("rimvio:share-link", { detail: { url } }),
        );
      }
      return { ok: true, message: "링크를 피드에 저장할 수 있어요" };
    }

    case "open_link": {
      const url = candidate.payload?.url ?? candidate.deepLink;
      if (typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return { ok: true, message: "링크를 열었어요" };
    }

    default:
      return { ok: false, message: "지원하지 않는 액션이에요" };
  }
}
