import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import type { BridgeContributionCapture } from "@/lib/experience-bridge/bridge-capture-spacetime";

function readTrimmed(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

/** Lock bridge contribution capture shape before SQL upsert. */
export function normalizeBridgeContributionCapture(
  input: BridgeContributionCapture,
): BridgeContributionCapture {
  const id = input.id.trim();
  if (!id) {
    throw new Error("capture_id_required");
  }
  if (input.kind !== "photo" && input.kind !== "video") {
    throw new Error("bridge_capture_kind_invalid");
  }

  const capturedAtIso = readTrimmed(input.capturedAtIso);
  if (!capturedAtIso) {
    throw new Error("captured_at_required");
  }

  const takenAtIso = readTrimmed(input.takenAtIso) ?? capturedAtIso;

  return {
    id,
    kind: input.kind,
    capturedAtIso,
    takenAtIso,
    mediaContextId: readTrimmed(input.mediaContextId) ?? undefined,
    placeLabel: readTrimmed(input.placeLabel) ?? undefined,
    label: readTrimmed(input.label) ?? undefined,
    url: readTrimmed(input.url) ?? undefined,
    fileHash: readTrimmed(input.fileHash),
    geohash: readTrimmed(input.geohash),
    lat: readNumber(input.lat),
    lng: readNumber(input.lng),
    storagePath: readTrimmed(input.storagePath),
    byteSize: readNumber(input.byteSize),
    ownerUserId: readTrimmed(input.ownerUserId) ?? undefined,
    authorDisplayName: readTrimmed(input.authorDisplayName) ?? undefined,
    authorAvatarUrl: readTrimmed(input.authorAvatarUrl) ?? undefined,
    verified: input.verified,
    autoAttached: input.autoAttached,
  };
}

export function bridgeCaptureTakenAtIso(capture: FeedCaptureFragment): string {
  const bridge = capture as BridgeContributionCapture;
  return bridge.takenAtIso?.trim() || capture.capturedAtIso;
}

export function mergeBridgeCaptureSpacetime(
  base: FeedCaptureFragment,
  patch: Partial<BridgeContributionCapture>,
): BridgeContributionCapture {
  return normalizeBridgeContributionCapture({
    ...base,
    ...patch,
    id: base.id,
    kind: base.kind,
    capturedAtIso: base.capturedAtIso,
  });
}
