import type { GlobePhotoIngestDraft } from "@/lib/globe/prepare-globe-photo-ingest-draft";
import type { SpacetimeResolveSource } from "@/lib/location-ping/types";

export type GlobePhotoDateConfidence = "exif" | "file_mtime" | "estimate";

export type ResolvedGlobePhotoDateHint = {
  capturedAtIso: string | null;
  dateLabel: string;
  confidence: GlobePhotoDateConfidence;
  /** Native date input value YYYY-MM-DD */
  dateInputValue: string;
  needsConfirm: boolean;
};

function mapConfidence(source: SpacetimeResolveSource): GlobePhotoDateConfidence {
  if (source === "exif_gps" || source === "exif_datetime") {
    return "exif";
  }
  if (source === "file_mtime") {
    return "file_mtime";
  }
  return "estimate";
}

function formatPhotoDateLabel(iso: string | null | undefined): string {
  if (!iso?.trim()) {
    return "날짜 미확인";
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "날짜 미확인";
  }
  return new Date(ms).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso?.trim()) {
    return "";
  }
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "";
  }
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function readPrimaryPeek(draft: GlobePhotoIngestDraft) {
  const index = draft.clusters[0]?.indices[0];
  if (typeof index !== "number") {
    return draft.peeks[0] ?? null;
  }
  return draft.peeks[index] ?? draft.peeks[0] ?? null;
}

/** Best-effort capture date for walkthrough confirm — always ask unless EXIF is solid. */
export function resolveGlobePhotoDateHint(
  draft: GlobePhotoIngestDraft,
): ResolvedGlobePhotoDateHint {
  const primary = draft.candidates[0] ?? null;
  const peek = readPrimaryPeek(draft);
  const capturedAtIso =
    peek?.capturedAtIso?.trim() ||
    draft.clusters[0]?.anchor.capturedAtIso?.trim() ||
    null;
  const confidence = peek ? mapConfidence(peek.resolveSource) : "estimate";
  const dateLabel =
    primary?.dateLabel?.trim() && primary.dateLabel !== "날짜 미확인"
      ? primary.dateLabel
      : formatPhotoDateLabel(capturedAtIso);
  const dateInputValue = toDateInputValue(capturedAtIso);

  return {
    capturedAtIso,
    dateLabel,
    confidence,
    dateInputValue,
    needsConfirm: confidence !== "exif" || !capturedAtIso,
  };
}

export function parsePhotoDateInputValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const ms = Date.parse(`${trimmed}T12:00:00`);
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}
