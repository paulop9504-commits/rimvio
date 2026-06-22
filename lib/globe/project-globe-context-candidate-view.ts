import type {
  BulkMediaSpacetimeCluster,
  BulkMediaSpacetimePeek,
} from "@/lib/feed/bulk-media-spacetime-types";
import { parseIsoMs } from "@/lib/feed/spacetime-fit";
import { summarizeBulkMediaClustersForWire } from "@/lib/feed/cluster-bulk-media-spacetime";

export type GlobeContextCandidateView = {
  clusterId: string;
  fileCount: number;
  fileIndices: readonly number[];
  title: string;
  placeLabel: string | null;
  dateLabel: string;
  tagLabel: string;
  ambiguous: boolean;
};

function formatCandidateDateRange(startIso: string, endIso: string): string {
  const startMs = parseIsoMs(startIso);
  const endMs = parseIsoMs(endIso);
  if (startMs === null) {
    return "날짜 미확인";
  }
  const start = new Date(startMs);
  const end = endMs !== null ? new Date(endMs) : start;
  const fmt = (when: Date) =>
    when.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  if (start.toDateString() === end.toDateString()) {
    return fmt(start);
  }
  return `${fmt(start)} ~ ${fmt(end)}`;
}

function inferTagLabel(title: string, placeLabel: string | null): string {
  const hay = `${title} ${placeLabel ?? ""}`.toLowerCase();
  if (/여행|trip|travel|휴가|vacation/u.test(hay)) {
    return "여행";
  }
  if (/카페|coffee|cafe/u.test(hay)) {
    return "카페";
  }
  if (/식당|맛집|restaurant|dinner|lunch/u.test(hay)) {
    return "식사";
  }
  if (/회의|미팅|meeting|출장/u.test(hay)) {
    return "만남";
  }
  return "그때 거기";
}

function inferTitle(input: {
  cluster: BulkMediaSpacetimeCluster;
  placeLabel: string | null;
  fileCount: number;
}): string {
  const enriched = input.cluster.title?.trim();
  if (enriched) {
    return enriched;
  }
  const place = input.placeLabel?.trim();
  if (place) {
    return place;
  }
  if (input.fileCount === 1) {
    return "이 순간";
  }
  return `사진 ${input.fileCount}장`;
}

export function projectGlobeContextCandidateViews(input: {
  clusters: readonly BulkMediaSpacetimeCluster[];
  peeks: readonly BulkMediaSpacetimePeek[];
}): GlobeContextCandidateView[] {
  const wire = summarizeBulkMediaClustersForWire({
    clusters: input.clusters,
    peeks: input.peeks,
  });
  const wireById = new Map(wire.map((row) => [row.id, row]));

  return input.clusters.map((cluster) => {
    const summary = wireById.get(cluster.id);
    const placeLabel =
      cluster.placeLabel?.trim() ||
      summary?.placeLabel?.trim() ||
      cluster.anchor.placeLabel?.trim() ||
      null;
    const fileCount = cluster.indices.length;
    const title = inferTitle({ cluster, placeLabel, fileCount });
    const startIso = summary?.startIso ?? cluster.anchor.capturedAtIso;
    const endIso = summary?.endIso ?? cluster.anchor.capturedAtIso;

    return {
      clusterId: cluster.id,
      fileCount,
      fileIndices: cluster.indices,
      title,
      placeLabel,
      dateLabel: formatCandidateDateRange(startIso, endIso),
      tagLabel: inferTagLabel(title, placeLabel),
      ambiguous: cluster.ambiguous,
    };
  });
}
