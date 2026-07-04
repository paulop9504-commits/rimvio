import type { GlobeContextVisibility } from "@/lib/globe/globe-context-visibility";

export const MIRROR_PROVENANCE_META_KEY = "mirrorProvenanceV1" as const;
export const MIRROR_AUDIT_META_KEY = "mirrorAuditV1" as const;
export const MIRROR_AUDIT_LIMIT = 16;

export const MIRROR_RESOURCE_KINDS = [
  "globe_context",
  "shared_globe_pin",
] as const;
export type MirrorResourceKind = (typeof MIRROR_RESOURCE_KINDS)[number];

export const MIRROR_PROJECTION_MODES = [
  "personal",
  "mirrored",
  "shared",
  "shared_mirrored",
] as const;
export type MirrorProjectionMode = (typeof MIRROR_PROJECTION_MODES)[number];

export const MIRROR_VIEWER_SCOPES = [
  "private_self",
  "peer_thread",
  "bridge_participants",
  "shared_globe_members",
  "external_discovery",
] as const;
export type MirrorViewerScope = (typeof MIRROR_VIEWER_SCOPES)[number];

export const MIRROR_SOURCE_KINDS = [
  "personal_capture",
  "bridge_share",
  "bridge_participant",
  "peer_shared_globe_pin",
] as const;
export type MirrorSourceKind = (typeof MIRROR_SOURCE_KINDS)[number];

export const MIRROR_INTEGRITY_ATTRIBUTIONS = [
  "self",
  "bridge_host",
  "friend",
  "mixed",
  "unknown",
] as const;
export type MirrorIntegrityAttribution =
  (typeof MIRROR_INTEGRITY_ATTRIBUTIONS)[number];

export const MIRROR_INTEGRITY_BASES = [
  "direct",
  "shared",
  "inferred",
  "unknown",
] as const;
export type MirrorIntegrityBasis = (typeof MIRROR_INTEGRITY_BASES)[number];

export const MIRROR_ORIGINALITY_STATES = [
  "original",
  "shared_copy",
  "mirror_copy",
] as const;
export type MirrorOriginality = (typeof MIRROR_ORIGINALITY_STATES)[number];

export const MIRROR_COMPLETENESS_STATES = [
  "complete",
  "partial",
  "minimal",
] as const;
export type MirrorCompleteness = (typeof MIRROR_COMPLETENESS_STATES)[number];

export const MIRROR_SYNC_STATES = [
  "synced",
  "pending_pull",
  "pending_push",
  "conflict",
  "detached",
  "source_deleted",
] as const;
export type MirrorSyncState = (typeof MIRROR_SYNC_STATES)[number];

export const MIRROR_VIEWER_ROLES = [
  "owner",
  "host",
  "participant",
  "recipient",
  "viewer",
] as const;
export type MirrorViewerRole = (typeof MIRROR_VIEWER_ROLES)[number];

export const MIRROR_EDIT_MODES = [
  "owner_only",
  "local_edits",
  "read_only",
] as const;
export type MirrorEditMode = (typeof MIRROR_EDIT_MODES)[number];

export const MIRROR_RESHARE_MODES = [
  "allowed",
  "owner_only",
  "blocked",
] as const;
export type MirrorReshareMode = (typeof MIRROR_RESHARE_MODES)[number];

export const MIRROR_DELETE_MODES = [
  "local_only",
  "owner_only",
  "blocked",
] as const;
export type MirrorDeleteMode = (typeof MIRROR_DELETE_MODES)[number];

export const MIRROR_OVERRIDE_FIELDS = ["title", "place", "note"] as const;
export type MirrorOverrideFieldKey = (typeof MIRROR_OVERRIDE_FIELDS)[number];

export type MirrorBridgeLinkage = {
  bridgeId?: string;
  peerThreadId?: string;
  sharedGlobeId?: string;
  sharedGlobePinId?: string;
};

export type MirrorOrigin = {
  sourceKind: MirrorSourceKind;
  originalAuthorUserId?: string | null;
  originalAuthorDisplayName?: string | null;
  authoredAtIso?: string | null;
  mirroredAtIso?: string | null;
  originEventId?: string | null;
  originCaptureId?: string | null;
  originNodeId?: string | null;
};

export type MirrorIntegrity = {
  attribution: MirrorIntegrityAttribution;
  placeBasis: MirrorIntegrityBasis;
  timeBasis: MirrorIntegrityBasis;
  originality: MirrorOriginality;
  completeness: MirrorCompleteness;
};

export type MirrorSyncSummary = {
  state: MirrorSyncState;
  lastSyncedAtIso?: string | null;
};

export type MirrorPermissions = {
  viewerRole: MirrorViewerRole;
  editMode: MirrorEditMode;
  reshareMode: MirrorReshareMode;
  deleteMode: MirrorDeleteMode;
};

export type MirrorOverrides = {
  titleOverridden?: boolean;
  placeOverridden?: boolean;
  noteOverridden?: boolean;
  titleUpstreamValue?: string | null;
  placeUpstreamValue?: string | null;
  noteUpstreamValue?: string | null;
  titleLocalValue?: string | null;
  placeLocalValue?: string | null;
  noteLocalValue?: string | null;
  updatedAtIso?: string | null;
};

export type MirrorProvenanceV1 = {
  version: 1;
  resourceKind: MirrorResourceKind;
  projectionMode: MirrorProjectionMode;
  visibility: GlobeContextVisibility;
  viewerScope: MirrorViewerScope;
  bridge: MirrorBridgeLinkage;
  origin: MirrorOrigin;
  integrity: MirrorIntegrity;
  sync: MirrorSyncSummary;
  permissions: MirrorPermissions;
  overrides?: MirrorOverrides;
};

export type MirrorProvenancePatch = {
  resourceKind?: MirrorResourceKind;
  projectionMode?: MirrorProjectionMode;
  visibility?: GlobeContextVisibility;
  viewerScope?: MirrorViewerScope;
  bridge?: Partial<MirrorBridgeLinkage>;
  origin?: Partial<MirrorOrigin>;
  integrity?: Partial<MirrorIntegrity>;
  sync?: Partial<MirrorSyncSummary>;
  permissions?: Partial<MirrorPermissions>;
  overrides?: Partial<MirrorOverrides>;
};

export const MIRROR_AUDIT_ACTIONS = [
  "bridge_shared",
  "bridge_participant_mirrored",
  "peer_shared_pin_mirrored",
  "sync_pulled",
  "local_context_edited",
  "local_override_set",
  "local_override_cleared",
  "detach_local",
  "delete_upstream",
] as const;
export type MirrorAuditAction = (typeof MIRROR_AUDIT_ACTIONS)[number];

export type MirrorAuditActor = {
  userId?: string | null;
  displayName?: string | null;
  role?: string | null;
};

export type MirrorAuditSubject = {
  eventId?: string | null;
  captureId?: string | null;
  nodeId?: string | null;
};

export type MirrorAuditRefs = MirrorBridgeLinkage;

export type MirrorAuditEntryV1 = {
  id: string;
  atIso: string;
  action: MirrorAuditAction;
  actor: MirrorAuditActor;
  subject?: MirrorAuditSubject;
  refs?: MirrorAuditRefs;
  diff?: string[];
  reason?: string | null;
};

export type MirrorAuditEntryDraft = {
  atIso?: string;
  action: MirrorAuditAction;
  actor?: MirrorAuditActor;
  subject?: MirrorAuditSubject;
  refs?: MirrorAuditRefs;
  diff?: readonly string[];
  reason?: string | null;
};
