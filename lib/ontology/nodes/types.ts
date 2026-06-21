import type { EventCandidateCategory, EventCandidateLifecycle } from "@/lib/events/event-candidate";
import type { FeedCaptureKind } from "@/lib/feed/feed-capture-types";

export type OntologyObjectKind = "experience" | "capture" | "bridge";

export type ExperienceNode = {
  objectKind: "experience";
  id: string;
  title: string;
  category: EventCandidateCategory;
  lifecycle: EventCandidateLifecycle;
  place: string | null;
  datetime: string | null;
};

export type CaptureNode = {
  objectKind: "capture";
  id: string;
  experienceId: string;
  kind: FeedCaptureKind;
  capturedAtIso: string;
  placeLabel: string | null;
  label: string | null;
  url: string | null;
  mediaContextId: string | null;
  ownerUserId: string | null;
  verified: boolean;
};

export type BridgeNode = {
  objectKind: "bridge";
  id: string;
  experienceId: string;
  bridgeId: string;
  role: "host" | "participant" | null;
  peerThreadId: string | null;
  hostUserId: string | null;
};

export type ExperienceSubgraph = {
  experience: ExperienceNode;
  captures: CaptureNode[];
  bridge: BridgeNode | null;
};
