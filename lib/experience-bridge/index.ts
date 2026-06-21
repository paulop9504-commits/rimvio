export {
  EXPERIENCE_BRIDGE_MAX_PARTICIPANTS,
  EXPERIENCE_BRIDGE_META_KEYS,
} from "@/lib/experience-bridge/constants";

export type {
  ExperienceBridgeParticipant,
  ExperienceBridgeParticipantStatus,
  ExperienceBridgeSnapshot,
  ExperienceBridgeState,
  ExperienceBridgeTimelineItem,
} from "@/lib/experience-bridge/experience-bridge-types";

export {
  canEditBridgeMedia,
  canExportBridgeMedia,
  canReadBridgeExperience,
  countActiveBridgeParticipants,
  isActiveBridgeParticipant,
} from "@/lib/experience-bridge/bridge-access";

export {
  acceptBridgeInvite,
  buildHostParticipant,
  createInitialBridgeState,
  declineBridgeInvite,
  inviteBridgeParticipant,
  leaveBridgeExperience,
  listReadableBridgeParticipants,
  removeBridgeParticipant,
} from "@/lib/experience-bridge/bridge-mutations";

export {
  buildBridgeSnapshot,
  mergeBridgeTimeline,
} from "@/lib/experience-bridge/merge-bridge-timeline";

export { publishPeerChatCaptureToBridgeIfLinked } from "@/lib/experience-bridge/publish-peer-chat-capture-to-bridge";

export { ensureBridgeParticipantPin } from "@/lib/experience-bridge/build-participant-pin";
export { completeBridgeInviteAccept } from "@/lib/experience-bridge/complete-bridge-invite-accept";
export {
  ensureBridgeLinkBeforePublish,
  requireBridgeLinkBeforePublish,
  resolveBridgePublishRole,
} from "@/lib/experience-bridge/ensure-bridge-link-before-publish";
export { projectBridgeCompanionStatus } from "@/lib/experience-bridge/project-bridge-companion-status";
export { projectBridgeStackPrep, listBridgeStackPrepItems, dismissBridgeStackPrep } from "@/lib/experience-bridge/project-bridge-stack-prep";
export { resolveBridgeContributionsForSync } from "@/lib/experience-bridge/resolve-bridge-contributions-for-sync";
export {
  readBridgeSyncPhase,
  setBridgeSyncPhase,
  subscribeBridgeSyncSession,
} from "@/lib/experience-bridge/bridge-sync-session";
