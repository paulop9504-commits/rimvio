import { haversineKm } from "@/lib/feed/spacetime-fit";
import type { ResearchTool } from "@/lib/research-engine/tools/types";

function readMeta(
  metadata: Record<string, string | number | boolean | null> | undefined,
  key: string,
): number | null {
  const v = metadata?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pure — stamp distanceKm when candidate + anchor coords exist. */
export const distanceCheckTool: ResearchTool = {
  id: "distance_check",
  labelKo: "동선 확인",
  async run({ candidate, context }) {
    const lat = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lat",
    );
    const lng = readMeta(
      candidate.metadata as Record<string, string | number | boolean | null> | undefined,
      "lng",
    );
    const anchorLat = context.persuasion.anchorLat;
    const anchorLng = context.persuasion.anchorLng;
    const calledArgs = {
      title: candidate.title,
      lat,
      lng,
      anchorLat: anchorLat ?? null,
      anchorLng: anchorLng ?? null,
    };

    if (
      lat == null ||
      lng == null ||
      anchorLat == null ||
      anchorLng == null ||
      !Number.isFinite(anchorLat) ||
      !Number.isFinite(anchorLng)
    ) {
      return {
        toolId: "distance_check",
        candidateId: candidate.id,
        status: "skip",
        summaryKo: "distance_check: 좌표/앵커 없음 — 생략",
        filledAxes: [],
        patch: null,
        evidence: {
          called: "distance(anchor)",
          args: calledArgs,
          got: null,
          gotLine: "missing_coords",
        },
      };
    }
    const km = haversineKm(anchorLat, anchorLng, lat, lng);
    const walkMin = Math.max(1, Math.round((km * 1000) / 80));
    const kmLabel = km < 10 ? km.toFixed(1) : String(Math.round(km));
    return {
      toolId: "distance_check",
      candidateId: candidate.id,
      status: "ok",
      summaryKo: `distance_check: 앵커까지 ${kmLabel}km · 도보 약 ${walkMin}분`,
      filledAxes: ["distance"],
      patch: {
        metadata: {
          distanceKm: Math.round(km * 1000) / 1000,
          distanceWalkMin: walkMin,
          distanceChecked: true,
          lat,
          lng,
        },
        snippetAppend: `앵커 도보 약 ${walkMin}분`,
      },
      evidence: {
        called: "distance(anchor)",
        args: calledArgs,
        got: {
          distanceKm: Math.round(km * 1000) / 1000,
          walkMin,
        },
        gotLine: `${kmLabel}km · walkMin=${walkMin}`,
      },
    };
  },
};
