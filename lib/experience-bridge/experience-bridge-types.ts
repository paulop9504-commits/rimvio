import type { EventCandidate } from "@/lib/events/event-candidate";
import type { FeedCaptureKind } from "@/lib/feed/feed-capture-types";
import type { FeedCaptureFragment } from "@/lib/feed/feed-capture-types";
import type { ExperiencePhase } from "@/lib/experience-window/experience-window-types";

export type ExperienceBridgeParticipantStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "left"
  | "removed";

export type ExperienceBridgeParticipant = {
  userId: string;
  displayName: string;
  status: ExperienceBridgeParticipantStatus;
  role: "host" | "member";
  invitedAtIso: string;
  joinedAtIso?: string | null;
  leftAtIso?: string | null;
};

export type ExperienceBridgeSnapshot = {
  eventId: string;
  hostUserId: string;
  peerThreadId: string | null;
  title: string;
  placeLabel: string;
  lat: number;
  lng: number;
  /** Minimal host event for participant recall projection. */
  eventSnapshot: EventCandidate;
  createdAtIso: string;
};

export type ExperienceBridgeState = {
  bridge: ExperienceBridgeSnapshot;
  participants: readonly ExperienceBridgeParticipant[];
};

export type ExperienceBridgeTimelineKind =
  | FeedCaptureKind
  | "shared_pin_photo"
  | "shared_pin_video"
  | "chat_message"
  | "bridge_prep_marker";

export type ExperienceBridgeTimelineItem = {
  id: string;
  kind: ExperienceBridgeTimelineKind;
  /** Sort key — same as occurred-at for all sources. */
  capturedAtIso: string;
  phase?: ExperiencePhase;
  ownerUserId: string;
  authorDisplayName: string;
  placeLabel?: string;
  imageUrl?: string | null;
  /** chat_message body (truncated on wire). */
  body?: string;
  /** View-only for non-owner media in shared bridge UI. */
  viewOnly: boolean;
};

export type ExperienceBridgeContribution = {
  contributorUserId: string;
  capture: FeedCaptureFragment & {
    ownerUserId?: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
  };
  createdAtIso: string;
};
