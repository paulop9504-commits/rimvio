import type { EventCandidate } from "@/lib/events/event-candidate";
import { isTicketUrl } from "@/lib/resolvers/ticket-deep-links";

export type ContextTicketArtifact = {
  labelKo: string;
  actionUrl: string | null;
  qrPreviewUrl: string | null;
};

function readArtifactRecord(value: unknown): ContextTicketArtifact | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Record<string, unknown>;
  const labelKo =
    typeof row.labelKo === "string" && row.labelKo.trim()
      ? row.labelKo.trim()
      : "티켓";
  const actionUrl =
    typeof row.actionUrl === "string" && row.actionUrl.trim()
      ? row.actionUrl.trim()
      : null;
  const qrPreviewUrl =
    typeof row.qrPreviewUrl === "string" && row.qrPreviewUrl.trim()
      ? row.qrPreviewUrl.trim()
      : null;
  if (!actionUrl && !qrPreviewUrl) {
    return null;
  }
  return { labelKo, actionUrl, qrPreviewUrl };
}

/** Ticket / QR artifact stored on globe context events. */
export function readContextTicketArtifact(
  event: EventCandidate,
): ContextTicketArtifact | null {
  const fromMeta = readArtifactRecord(event.metadata?.contextTicketArtifact);
  if (fromMeta) {
    return fromMeta;
  }

  const ticketUrl =
    typeof event.metadata?.ticketUrl === "string"
      ? event.metadata.ticketUrl.trim()
      : "";
  if (ticketUrl && isTicketUrl(ticketUrl)) {
    return {
      labelKo: "티켓",
      actionUrl: ticketUrl,
      qrPreviewUrl: null,
    };
  }

  const shareUrl = event.description?.trim() ?? "";
  if (shareUrl && isTicketUrl(shareUrl)) {
    return {
      labelKo: "티켓",
      actionUrl: shareUrl,
      qrPreviewUrl: null,
    };
  }

  return null;
}

export function isTicketLikeContext(event: EventCandidate): boolean {
  if (readContextTicketArtifact(event)) {
    return true;
  }
  const category = event.category?.trim() ?? "";
  return category === "travel" || category === "concert" || /티켓|입장|공연|놀이/u.test(event.title);
}
