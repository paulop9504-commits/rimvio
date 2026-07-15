import { computeLodgingYouTubeConfidence } from "@/lib/globe/lodging/compute-lodging-youtube-confidence";
import type { ResearchTool } from "@/lib/research-engine/tools/types";

function readMeta(
  metadata: Record<string, string | number | boolean | null> | undefined,
  key: string,
): number | null {
  const v = metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Soft YouTube preview confidence — runtime fetch or snippet-as-proxy. */
export const ytPreviewTool: ResearchTool = {
  id: "yt_preview",
  labelKo: "영상 근거",
  async run({ candidate, context }) {
    const lat = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lat",
    );
    const lng = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lng",
    );
    const calledArgs = {
      title: candidate.title,
      lat,
      lng,
    };

    const existing = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "youtubeConfidence",
    );
    if (existing != null && existing >= 0.7) {
      return {
        toolId: "yt_preview",
        candidateId: candidate.id,
        status: "skip",
        summaryKo: "yt_preview: 이미 확보 — 생략",
        filledAxes: ["crossCheck"],
        patch: null,
        evidence: {
          called: "youtube.preview",
          args: calledArgs,
          got: { confidence: existing },
          gotLine: "already_have",
        },
      };
    }

    let confidence: number | null = null;
    let videoTitle: string | null = null;

    if (context.runtime?.fetchYtPreview) {
      try {
        const fetched = await context.runtime.fetchYtPreview({
          title: candidate.title,
          lat,
          lng,
        });
        if (fetched?.confidence != null) {
          confidence = fetched.confidence;
          videoTitle = fetched.videoTitle ?? null;
        }
      } catch {
        // soft
      }
    }

    if (confidence == null && !context.runtime?.fetchYtPreview) {
      confidence = computeLodgingYouTubeConfidence({
        placeName: candidate.title,
        title: candidate.snippet,
        description: candidate.snippet,
      });
    }

    if (confidence == null || confidence < 0.55) {
      return {
        toolId: "yt_preview",
        candidateId: candidate.id,
        status: "skip",
        summaryKo: "yt_preview: YouTube 매칭 없음",
        filledAxes: [],
        patch: null,
        evidence: {
          called: "youtube.preview",
          args: calledArgs,
          got: null,
          gotLine: "no_match",
        },
      };
    }

    const pct = Math.round(confidence * 100);
    return {
      toolId: "yt_preview",
      candidateId: candidate.id,
      status: "ok",
      summaryKo: videoTitle
        ? `yt_preview: 「${videoTitle.slice(0, 32)}」 ${pct}%`
        : `yt_preview: 교차 근거 ${pct}%`,
      filledAxes: ["crossCheck"],
      patch: {
        metadata: {
          youtubeConfidence: Math.round(confidence * 1000) / 1000,
          ytPreview: true,
        },
        snippetAppend:
          confidence >= 0.7 ? "영상 교차 근거" : "약 영상 신호",
      },
      evidence: {
        called: "youtube.preview",
        args: calledArgs,
        got: {
          confidence: Math.round(confidence * 1000) / 1000,
          videoTitle,
        },
        gotLine: videoTitle
          ? `confidence=${pct}% · 「${videoTitle.slice(0, 24)}」`
          : `confidence=${pct}%`,
      },
    };
  },
};
