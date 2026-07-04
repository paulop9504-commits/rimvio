import type { EventCandidate } from "@/lib/events/event-candidate";
import { readFeedCaptureFragments } from "@/lib/feed/feed-capture-metadata";
import {
  defaultGlobeContextVisibilityMetadata,
  type GlobeContextVisibility,
} from "@/lib/globe/globe-context-visibility";
import {
  MIRROR_AUDIT_ACTIONS,
  MIRROR_AUDIT_LIMIT,
  MIRROR_AUDIT_META_KEY,
  MIRROR_COMPLETENESS_STATES,
  MIRROR_DELETE_MODES,
  MIRROR_EDIT_MODES,
  MIRROR_INTEGRITY_ATTRIBUTIONS,
  MIRROR_INTEGRITY_BASES,
  MIRROR_ORIGINALITY_STATES,
  MIRROR_OVERRIDE_FIELDS,
  MIRROR_PROJECTION_MODES,
  MIRROR_PROVENANCE_META_KEY,
  MIRROR_RESHARE_MODES,
  MIRROR_RESOURCE_KINDS,
  MIRROR_SOURCE_KINDS,
  MIRROR_SYNC_STATES,
  MIRROR_VIEWER_ROLES,
  MIRROR_VIEWER_SCOPES,
  type MirrorAuditAction,
  type MirrorAuditActor,
  type MirrorAuditEntryDraft,
  type MirrorAuditEntryV1,
  type MirrorAuditRefs,
  type MirrorAuditSubject,
  type MirrorBridgeLinkage,
  type MirrorCompleteness,
  type MirrorDeleteMode,
  type MirrorEditMode,
  type MirrorIntegrity,
  type MirrorIntegrityAttribution,
  type MirrorIntegrityBasis,
  type MirrorOrigin,
  type MirrorOriginality,
  type MirrorOverrideFieldKey,
  type MirrorPermissions,
  type MirrorProjectionMode,
  type MirrorProvenancePatch,
  type MirrorProvenanceV1,
  type MirrorReshareMode,
  type MirrorSyncState,
  type MirrorSyncSummary,
  type MirrorViewerRole,
  type MirrorViewerScope,
} from "@/lib/globe/mirror-provenance-types";

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNullableTrimmedString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  return asTrimmedString(value);
}

function hasOwn(
  value: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function withDefinedStrings<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (typeof item === "string") {
        return item.trim().length > 0;
      }
      return item !== undefined && item !== null;
    }),
  ) as T;
}

function readVisibility(
  metadata: Record<string, unknown> | null | undefined,
): GlobeContextVisibility {
  const raw = metadata?.globeContextVisibility;
  return raw === "external"
    ? "external"
    : defaultGlobeContextVisibilityMetadata().globeContextVisibility;
}

function defaultViewerScopeForMode(
  mode: MirrorProjectionMode,
): MirrorViewerScope {
  switch (mode) {
    case "shared":
      return "bridge_participants";
    case "shared_mirrored":
      return "peer_thread";
    case "mirrored":
      return "private_self";
    case "personal":
    default:
      return "private_self";
  }
}

function defaultViewerRoleForMode(mode: MirrorProjectionMode): MirrorViewerRole {
  switch (mode) {
    case "shared":
      return "host";
    case "shared_mirrored":
      return "participant";
    case "mirrored":
      return "recipient";
    case "personal":
    default:
      return "owner";
  }
}

function defaultEditModeForMode(mode: MirrorProjectionMode): MirrorEditMode {
  switch (mode) {
    case "shared":
      return "owner_only";
    case "shared_mirrored":
    case "mirrored":
      return "local_edits";
    case "personal":
    default:
      return "owner_only";
  }
}

function defaultReshareModeForMode(
  mode: MirrorProjectionMode,
): MirrorReshareMode {
  switch (mode) {
    case "shared":
      return "allowed";
    case "shared_mirrored":
      return "owner_only";
    case "mirrored":
      return "blocked";
    case "personal":
    default:
      return "allowed";
  }
}

function defaultDeleteModeForMode(mode: MirrorProjectionMode): MirrorDeleteMode {
  switch (mode) {
    case "shared":
      return "owner_only";
    case "shared_mirrored":
    case "mirrored":
      return "local_only";
    case "personal":
    default:
      return "owner_only";
  }
}

function defaultAttributionForMode(
  mode: MirrorProjectionMode,
): MirrorIntegrityAttribution {
  switch (mode) {
    case "shared":
      return "self";
    case "shared_mirrored":
      return "bridge_host";
    case "mirrored":
      return "friend";
    case "personal":
    default:
      return "self";
  }
}

function defaultOriginalityForMode(
  mode: MirrorProjectionMode,
): MirrorOriginality {
  switch (mode) {
    case "shared":
      return "original";
    case "shared_mirrored":
    case "mirrored":
      return "mirror_copy";
    case "personal":
    default:
      return "original";
  }
}

function deriveCompleteness(
  origin: MirrorOrigin,
  bridge: MirrorBridgeLinkage,
): MirrorCompleteness {
  const score = [
    origin.originalAuthorUserId || origin.originalAuthorDisplayName,
    origin.authoredAtIso,
    origin.originEventId || origin.originNodeId,
    bridge.bridgeId || bridge.sharedGlobePinId || bridge.sharedGlobeId,
  ].filter(Boolean).length;
  if (score >= 4) {
    return "complete";
  }
  if (score >= 2) {
    return "partial";
  }
  return "minimal";
}

function readBridgeLinkage(value: unknown): MirrorBridgeLinkage {
  const row = asRecord(value);
  if (!row) {
    return {};
  }
  return withDefinedStrings({
    bridgeId: asTrimmedString(row.bridgeId),
    peerThreadId: asTrimmedString(row.peerThreadId),
    sharedGlobeId: asTrimmedString(row.sharedGlobeId),
    sharedGlobePinId: asTrimmedString(row.sharedGlobePinId),
  });
}

function readOrigin(value: unknown): MirrorOrigin | null {
  const row = asRecord(value);
  if (!row || !isOneOf(row.sourceKind, MIRROR_SOURCE_KINDS)) {
    return null;
  }
  return {
    sourceKind: row.sourceKind,
    originalAuthorUserId:
      asTrimmedString(row.originalAuthorUserId) ?? null,
    originalAuthorDisplayName:
      asTrimmedString(row.originalAuthorDisplayName) ?? null,
    authoredAtIso: asTrimmedString(row.authoredAtIso) ?? null,
    mirroredAtIso: asTrimmedString(row.mirroredAtIso) ?? null,
    originEventId: asTrimmedString(row.originEventId) ?? null,
    originCaptureId: asTrimmedString(row.originCaptureId) ?? null,
    originNodeId: asTrimmedString(row.originNodeId) ?? null,
  };
}

function readIntegrity(
  value: unknown,
  projectionMode: MirrorProjectionMode,
  origin: MirrorOrigin,
  bridge: MirrorBridgeLinkage,
): MirrorIntegrity {
  const row = asRecord(value);
  const attribution =
    row && isOneOf(row.attribution, MIRROR_INTEGRITY_ATTRIBUTIONS)
      ? row.attribution
      : defaultAttributionForMode(projectionMode);
  const placeBasis =
    row && isOneOf(row.placeBasis, MIRROR_INTEGRITY_BASES)
      ? row.placeBasis
      : "direct";
  const timeBasis =
    row && isOneOf(row.timeBasis, MIRROR_INTEGRITY_BASES)
      ? row.timeBasis
      : "direct";
  const originality =
    row && isOneOf(row.originality, MIRROR_ORIGINALITY_STATES)
      ? row.originality
      : defaultOriginalityForMode(projectionMode);
  const completeness =
    row && isOneOf(row.completeness, MIRROR_COMPLETENESS_STATES)
      ? row.completeness
      : deriveCompleteness(origin, bridge);
  return {
    attribution,
    placeBasis,
    timeBasis,
    originality,
    completeness,
  };
}

function readSyncSummary(
  value: unknown,
  nowIso: string,
): MirrorSyncSummary {
  const row = asRecord(value);
  const state =
    row && isOneOf(row.state, MIRROR_SYNC_STATES) ? row.state : "synced";
  return {
    state,
    lastSyncedAtIso:
      asTrimmedString(row?.lastSyncedAtIso) ?? (state === "synced" ? nowIso : null),
  };
}

function readPermissions(
  value: unknown,
  projectionMode: MirrorProjectionMode,
): MirrorPermissions {
  const row = asRecord(value);
  return {
    viewerRole:
      row && isOneOf(row.viewerRole, MIRROR_VIEWER_ROLES)
        ? row.viewerRole
        : defaultViewerRoleForMode(projectionMode),
    editMode:
      row && isOneOf(row.editMode, MIRROR_EDIT_MODES)
        ? row.editMode
        : defaultEditModeForMode(projectionMode),
    reshareMode:
      row && isOneOf(row.reshareMode, MIRROR_RESHARE_MODES)
        ? row.reshareMode
        : defaultReshareModeForMode(projectionMode),
    deleteMode:
      row && isOneOf(row.deleteMode, MIRROR_DELETE_MODES)
        ? row.deleteMode
        : defaultDeleteModeForMode(projectionMode),
  };
}

function readOverrides(
  value: unknown,
): MirrorProvenanceV1["overrides"] | undefined {
  const row = asRecord(value);
  if (!row) {
    return undefined;
  }
  const next = {
    titleOverridden: row.titleOverridden === true ? true : undefined,
    placeOverridden: row.placeOverridden === true ? true : undefined,
    noteOverridden: row.noteOverridden === true ? true : undefined,
    titleUpstreamValue: asNullableTrimmedString(row.titleUpstreamValue),
    placeUpstreamValue: asNullableTrimmedString(row.placeUpstreamValue),
    noteUpstreamValue: asNullableTrimmedString(row.noteUpstreamValue),
    titleLocalValue: asNullableTrimmedString(row.titleLocalValue),
    placeLocalValue: asNullableTrimmedString(row.placeLocalValue),
    noteLocalValue: asNullableTrimmedString(row.noteLocalValue),
    updatedAtIso: asNullableTrimmedString(row.updatedAtIso),
  };
  return Object.values(next).some((item) => item !== undefined && item !== null)
    ? next
    : undefined;
}

function hasActiveOverrides(
  overrides: MirrorProvenanceV1["overrides"] | undefined,
): boolean {
  return Boolean(
    overrides?.titleOverridden ||
      overrides?.placeOverridden ||
      overrides?.noteOverridden,
  );
}

function listActiveOverrideFields(
  overrides: MirrorProvenanceV1["overrides"] | undefined,
): MirrorOverrideFieldKey[] {
  return MIRROR_OVERRIDE_FIELDS.filter((field) => {
    switch (field) {
      case "title":
        return overrides?.titleOverridden === true;
      case "place":
        return overrides?.placeOverridden === true;
      case "note":
        return overrides?.noteOverridden === true;
      default:
        return false;
    }
  });
}

function mergeOverrides(
  base: MirrorProvenanceV1["overrides"] | undefined,
  patch: MirrorProvenancePatch["overrides"] | undefined,
): MirrorProvenanceV1["overrides"] | undefined {
  if (!base && !patch) {
    return undefined;
  }
  const patchRow = (patch ?? null) as Record<string, unknown> | null;
  const titleOverridden = hasOwn(patchRow, "titleOverridden")
    ? patch?.titleOverridden === true
      ? true
      : undefined
    : base?.titleOverridden;
  const placeOverridden = hasOwn(patchRow, "placeOverridden")
    ? patch?.placeOverridden === true
      ? true
      : undefined
    : base?.placeOverridden;
  const noteOverridden = hasOwn(patchRow, "noteOverridden")
    ? patch?.noteOverridden === true
      ? true
      : undefined
    : base?.noteOverridden;

  const titleUpstreamValue = titleOverridden
    ? hasOwn(patchRow, "titleUpstreamValue")
      ? asNullableTrimmedString(patch?.titleUpstreamValue) ?? null
      : base?.titleUpstreamValue ?? null
    : undefined;
  const placeUpstreamValue = placeOverridden
    ? hasOwn(patchRow, "placeUpstreamValue")
      ? asNullableTrimmedString(patch?.placeUpstreamValue) ?? null
      : base?.placeUpstreamValue ?? null
    : undefined;
  const noteUpstreamValue = noteOverridden
    ? hasOwn(patchRow, "noteUpstreamValue")
      ? asNullableTrimmedString(patch?.noteUpstreamValue) ?? null
      : base?.noteUpstreamValue ?? null
    : undefined;
  const titleLocalValue = titleOverridden
    ? hasOwn(patchRow, "titleLocalValue")
      ? asNullableTrimmedString(patch?.titleLocalValue) ?? null
      : base?.titleLocalValue ?? null
    : undefined;
  const placeLocalValue = placeOverridden
    ? hasOwn(patchRow, "placeLocalValue")
      ? asNullableTrimmedString(patch?.placeLocalValue) ?? null
      : base?.placeLocalValue ?? null
    : undefined;
  const noteLocalValue = noteOverridden
    ? hasOwn(patchRow, "noteLocalValue")
      ? asNullableTrimmedString(patch?.noteLocalValue) ?? null
      : base?.noteLocalValue ?? null
    : undefined;
  const updatedAtIso = hasActiveOverrides({
    titleOverridden,
    placeOverridden,
    noteOverridden,
  })
    ? hasOwn(patchRow, "updatedAtIso")
      ? asNullableTrimmedString(patch?.updatedAtIso) ?? null
      : base?.updatedAtIso ?? null
    : undefined;

  const next = {
    titleOverridden,
    placeOverridden,
    noteOverridden,
    titleUpstreamValue,
    placeUpstreamValue,
    noteUpstreamValue,
    titleLocalValue,
    placeLocalValue,
    noteLocalValue,
    updatedAtIso,
  };
  return hasActiveOverrides(next) ? next : undefined;
}

function mergeOrigin(base: MirrorOrigin, patch?: Partial<MirrorOrigin>): MirrorOrigin {
  if (!patch) {
    return base;
  }
  return {
    sourceKind:
      patch.sourceKind && isOneOf(patch.sourceKind, MIRROR_SOURCE_KINDS)
        ? patch.sourceKind
        : base.sourceKind,
    originalAuthorUserId:
      patch.originalAuthorUserId?.trim() || base.originalAuthorUserId || null,
    originalAuthorDisplayName:
      patch.originalAuthorDisplayName?.trim() ||
      base.originalAuthorDisplayName ||
      null,
    authoredAtIso: patch.authoredAtIso?.trim() || base.authoredAtIso || null,
    mirroredAtIso:
      patch.mirroredAtIso?.trim() || base.mirroredAtIso || null,
    originEventId: patch.originEventId?.trim() || base.originEventId || null,
    originCaptureId:
      patch.originCaptureId?.trim() || base.originCaptureId || null,
    originNodeId: patch.originNodeId?.trim() || base.originNodeId || null,
  };
}

function mergeBridge(
  base: MirrorBridgeLinkage,
  patch?: Partial<MirrorBridgeLinkage>,
): MirrorBridgeLinkage {
  return withDefinedStrings({
    ...base,
    ...(patch?.bridgeId?.trim() ? { bridgeId: patch.bridgeId.trim() } : {}),
    ...(patch?.peerThreadId?.trim()
      ? { peerThreadId: patch.peerThreadId.trim() }
      : {}),
    ...(patch?.sharedGlobeId?.trim()
      ? { sharedGlobeId: patch.sharedGlobeId.trim() }
      : {}),
    ...(patch?.sharedGlobePinId?.trim()
      ? { sharedGlobePinId: patch.sharedGlobePinId.trim() }
      : {}),
  });
}

function mergeSync(
  base: MirrorSyncSummary,
  patch: Partial<MirrorSyncSummary> | undefined,
  nowIso: string,
): MirrorSyncSummary {
  if (!patch) {
    return base;
  }
  const state =
    patch.state && isOneOf(patch.state, MIRROR_SYNC_STATES)
      ? patch.state
      : base.state;
  return {
    state,
    lastSyncedAtIso:
      patch.lastSyncedAtIso?.trim() ||
      base.lastSyncedAtIso ||
      (state === "synced" ? nowIso : null),
  };
}

function mergePermissions(
  base: MirrorPermissions,
  patch: Partial<MirrorPermissions> | undefined,
): MirrorPermissions {
  if (!patch) {
    return base;
  }
  return {
    viewerRole:
      patch.viewerRole && isOneOf(patch.viewerRole, MIRROR_VIEWER_ROLES)
        ? patch.viewerRole
        : base.viewerRole,
    editMode:
      patch.editMode && isOneOf(patch.editMode, MIRROR_EDIT_MODES)
        ? patch.editMode
        : base.editMode,
    reshareMode:
      patch.reshareMode && isOneOf(patch.reshareMode, MIRROR_RESHARE_MODES)
        ? patch.reshareMode
        : base.reshareMode,
    deleteMode:
      patch.deleteMode && isOneOf(patch.deleteMode, MIRROR_DELETE_MODES)
        ? patch.deleteMode
        : base.deleteMode,
  };
}

function mergeIntegrity(
  base: MirrorIntegrity,
  patch: Partial<MirrorIntegrity> | undefined,
  projectionMode: MirrorProjectionMode,
  origin: MirrorOrigin,
  bridge: MirrorBridgeLinkage,
): MirrorIntegrity {
  if (!patch) {
    return {
      ...base,
      completeness:
        base.completeness ||
        deriveCompleteness(origin, bridge),
    };
  }
  return {
    attribution:
      patch.attribution && isOneOf(patch.attribution, MIRROR_INTEGRITY_ATTRIBUTIONS)
        ? patch.attribution
        : base.attribution || defaultAttributionForMode(projectionMode),
    placeBasis:
      patch.placeBasis && isOneOf(patch.placeBasis, MIRROR_INTEGRITY_BASES)
        ? patch.placeBasis
        : base.placeBasis,
    timeBasis:
      patch.timeBasis && isOneOf(patch.timeBasis, MIRROR_INTEGRITY_BASES)
        ? patch.timeBasis
        : base.timeBasis,
    originality:
      patch.originality && isOneOf(patch.originality, MIRROR_ORIGINALITY_STATES)
        ? patch.originality
        : base.originality || defaultOriginalityForMode(projectionMode),
    completeness:
      patch.completeness && isOneOf(patch.completeness, MIRROR_COMPLETENESS_STATES)
        ? patch.completeness
        : deriveCompleteness(origin, bridge),
  };
}

function buildAuditActor(actor?: MirrorAuditActor): MirrorAuditActor {
  return {
    userId: actor?.userId?.trim() || null,
    displayName: actor?.displayName?.trim() || null,
    role: actor?.role?.trim() || null,
  };
}

function buildAuditSubject(subject?: MirrorAuditSubject): MirrorAuditSubject | undefined {
  if (!subject) {
    return undefined;
  }
  const next = {
    eventId: subject.eventId?.trim() || null,
    captureId: subject.captureId?.trim() || null,
    nodeId: subject.nodeId?.trim() || null,
  };
  return Object.values(next).some(Boolean) ? next : undefined;
}

function buildAuditRefs(refs?: MirrorAuditRefs): MirrorAuditRefs | undefined {
  if (!refs) {
    return undefined;
  }
  const next = mergeBridge({}, refs);
  return Object.keys(next).length > 0 ? next : undefined;
}

export function readMirrorProvenance(
  metadata: Record<string, unknown> | null | undefined,
): MirrorProvenanceV1 | null {
  const raw = asRecord(metadata?.[MIRROR_PROVENANCE_META_KEY]);
  if (!raw) {
    return null;
  }

  const resourceKind = isOneOf(raw.resourceKind, MIRROR_RESOURCE_KINDS)
    ? raw.resourceKind
    : null;
  const projectionMode = isOneOf(raw.projectionMode, MIRROR_PROJECTION_MODES)
    ? raw.projectionMode
    : null;
  if (!resourceKind || !projectionMode) {
    return null;
  }

  const bridge = readBridgeLinkage(raw.bridge);
  const origin = readOrigin(raw.origin);
  if (!origin) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const viewerScope = isOneOf(raw.viewerScope, MIRROR_VIEWER_SCOPES)
    ? raw.viewerScope
    : defaultViewerScopeForMode(projectionMode);

  return {
    version: 1,
    resourceKind,
    projectionMode,
    visibility:
      raw.visibility === "external" ? "external" : readVisibility(metadata),
    viewerScope,
    bridge,
    origin,
    integrity: readIntegrity(raw.integrity, projectionMode, origin, bridge),
    sync: readSyncSummary(raw.sync, nowIso),
    permissions: readPermissions(raw.permissions, projectionMode),
    overrides: readOverrides(raw.overrides),
  };
}

export function readMirrorAudit(
  metadata: Record<string, unknown> | null | undefined,
): MirrorAuditEntryV1[] {
  const raw = metadata?.[MIRROR_AUDIT_META_KEY];
  if (!Array.isArray(raw)) {
    return [];
  }
  const rows: MirrorAuditEntryV1[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row || !isOneOf(row.action, MIRROR_AUDIT_ACTIONS)) {
      continue;
    }
    const id = asTrimmedString(row.id);
    const atIso = asTrimmedString(row.atIso);
    if (!id || !atIso) {
      continue;
    }
    rows.push({
      id,
      atIso,
      action: row.action,
      actor: buildAuditActor(asRecord(row.actor) ?? undefined),
      subject: buildAuditSubject(asRecord(row.subject) ?? undefined),
      refs: buildAuditRefs(asRecord(row.refs) ?? undefined),
      diff: Array.isArray(row.diff)
        ? row.diff.filter((value): value is string => typeof value === "string")
        : undefined,
      reason: asTrimmedString(row.reason) ?? null,
    });
  }
  return rows.slice(-MIRROR_AUDIT_LIMIT);
}

export function buildMirrorAuditEntry(
  draft: MirrorAuditEntryDraft,
): MirrorAuditEntryV1 {
  const atIso = draft.atIso?.trim() || new Date().toISOString();
  const action: MirrorAuditAction = isOneOf(draft.action, MIRROR_AUDIT_ACTIONS)
    ? draft.action
    : "sync_pulled";
  return {
    id: `${action}:${atIso}`,
    atIso,
    action,
    actor: buildAuditActor(draft.actor),
    subject: buildAuditSubject(draft.subject),
    refs: buildAuditRefs(draft.refs),
    diff: draft.diff?.filter((value) => value.trim().length > 0).map((value) => value.trim()),
    reason: draft.reason?.trim() || null,
  };
}

export function appendMirrorAudit(
  metadata: Record<string, unknown> | null | undefined,
  draft: MirrorAuditEntryDraft,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  const entries = readMirrorAudit(next);
  const built = buildMirrorAuditEntry(draft);
  const last = entries[entries.length - 1];
  const canDedupe = !new Set<MirrorAuditAction>([
    "local_override_set",
    "local_override_cleared",
    "detach_local",
    "delete_upstream",
  ]).has(built.action);
  if (
    canDedupe &&
    last &&
    last.action === built.action &&
    last.subject?.eventId === built.subject?.eventId &&
    last.subject?.nodeId === built.subject?.nodeId &&
    last.refs?.bridgeId === built.refs?.bridgeId &&
    last.refs?.sharedGlobePinId === built.refs?.sharedGlobePinId
  ) {
    return next;
  }
  next[MIRROR_AUDIT_META_KEY] = [...entries, built].slice(-MIRROR_AUDIT_LIMIT);
  return next;
}

export function upsertMirrorProvenanceMetadata(input: {
  metadata?: Record<string, unknown> | null;
  patch: MirrorProvenancePatch;
  audit?: MirrorAuditEntryDraft | null;
  nowIso?: string;
}): Record<string, unknown> {
  const baseMeta = { ...(input.metadata ?? {}) };
  const nowIso = input.nowIso?.trim() || new Date().toISOString();
  const base =
    readMirrorProvenance(baseMeta) ??
    ({
      version: 1,
      resourceKind: input.patch.resourceKind ?? "globe_context",
      projectionMode: input.patch.projectionMode ?? "personal",
      visibility: input.patch.visibility ?? readVisibility(baseMeta),
      viewerScope: defaultViewerScopeForMode(input.patch.projectionMode ?? "personal"),
      bridge: {},
      origin: {
        sourceKind: input.patch.origin?.sourceKind ?? "personal_capture",
        originalAuthorUserId: null,
        originalAuthorDisplayName: null,
        authoredAtIso: null,
        mirroredAtIso: null,
        originEventId: null,
        originCaptureId: null,
        originNodeId: null,
      },
      integrity: {
        attribution: defaultAttributionForMode(
          input.patch.projectionMode ?? "personal",
        ),
        placeBasis: "direct",
        timeBasis: "direct",
        originality: defaultOriginalityForMode(
          input.patch.projectionMode ?? "personal",
        ),
        completeness: "minimal",
      },
      sync: {
        state: "synced",
        lastSyncedAtIso: nowIso,
      },
      permissions: {
        viewerRole: defaultViewerRoleForMode(
          input.patch.projectionMode ?? "personal",
        ),
        editMode: defaultEditModeForMode(
          input.patch.projectionMode ?? "personal",
        ),
        reshareMode: defaultReshareModeForMode(
          input.patch.projectionMode ?? "personal",
        ),
        deleteMode: defaultDeleteModeForMode(
          input.patch.projectionMode ?? "personal",
        ),
      },
      overrides: undefined,
    } satisfies MirrorProvenanceV1);

  const projectionMode =
    input.patch.projectionMode && isOneOf(input.patch.projectionMode, MIRROR_PROJECTION_MODES)
      ? input.patch.projectionMode
      : base.projectionMode;
  const bridge = mergeBridge(base.bridge, input.patch.bridge);
  const origin = mergeOrigin(base.origin, input.patch.origin);
  const visibility = input.patch.visibility ?? base.visibility ?? readVisibility(baseMeta);
  const viewerScope =
    input.patch.viewerScope && isOneOf(input.patch.viewerScope, MIRROR_VIEWER_SCOPES)
      ? input.patch.viewerScope
      : base.viewerScope || defaultViewerScopeForMode(projectionMode);

  const integrity = mergeIntegrity(
    base.integrity,
    input.patch.integrity,
    projectionMode,
    origin,
    bridge,
  );
  const sync = mergeSync(base.sync, input.patch.sync, nowIso);
  const permissions = mergePermissions(base.permissions, input.patch.permissions);
  const overrides = mergeOverrides(base.overrides, input.patch.overrides);

  let next: Record<string, unknown> = {
    ...baseMeta,
    [MIRROR_PROVENANCE_META_KEY]: {
      version: 1,
      resourceKind:
        input.patch.resourceKind && isOneOf(input.patch.resourceKind, MIRROR_RESOURCE_KINDS)
          ? input.patch.resourceKind
          : base.resourceKind,
      projectionMode,
      visibility,
      viewerScope,
      bridge,
      origin,
      integrity,
      sync,
      permissions,
      ...(overrides && Object.values(overrides).some(Boolean)
        ? { overrides }
        : {}),
    } satisfies MirrorProvenanceV1,
  };

  if (input.audit) {
    next = appendMirrorAudit(next, input.audit);
  }
  return next;
}

export type MirrorProvenanceSummary = {
  eventId: string;
  provenance: MirrorProvenanceV1;
  projectionMode: MirrorProjectionMode;
  visibility: GlobeContextVisibility;
  viewerScope: MirrorViewerScope;
  syncState: MirrorSyncState;
  lastSyncedAtIso: string | null;
  viewerRole: MirrorViewerRole;
  editMode: MirrorEditMode;
  reshareMode: MirrorReshareMode;
  deleteMode: MirrorDeleteMode;
  deleteIntent: "detach_local" | "delete_upstream" | "blocked";
  hasLocalOverrides: boolean;
  overrideFields: MirrorOverrideFieldKey[];
  overridesUpdatedAtIso: string | null;
  sourceKind: MirrorOrigin["sourceKind"];
  originalAuthorDisplayName: string | null;
  originalAuthorUserId: string | null;
  showOriginalAuthor: boolean;
  authoredAtIso: string | null;
  mirroredAtIso: string | null;
  bridgeId: string | null;
  peerThreadId: string | null;
  sharedGlobeId: string | null;
  sharedGlobePinId: string | null;
  originEventId: string | null;
  originCaptureId: string | null;
  originNodeId: string | null;
  attribution: MirrorIntegrityAttribution;
  placeBasis: MirrorIntegrityBasis;
  timeBasis: MirrorIntegrityBasis;
  originality: MirrorOriginality;
  completeness: MirrorCompleteness;
  auditCount: number;
};

export function projectMirrorProvenanceSummary(input: {
  event: EventCandidate | null | undefined;
  viewerUserId?: string | null;
}): MirrorProvenanceSummary | null {
  const event = input.event;
  if (!event) {
    return null;
  }
  const provenance = readMirrorProvenance(event.metadata);
  if (!provenance) {
    return null;
  }

  const viewerUserId = input.viewerUserId?.trim() || null;
  const captureAuthor = readFeedCaptureFragments(event).find(
    (row) => row.authorDisplayName?.trim() || row.ownerUserId?.trim(),
  );
  const originalAuthorDisplayName =
    provenance.origin.originalAuthorDisplayName?.trim() ||
    captureAuthor?.authorDisplayName?.trim() ||
    null;
  const originalAuthorUserId =
    provenance.origin.originalAuthorUserId?.trim() ||
    captureAuthor?.ownerUserId?.trim() ||
    null;
  const showOriginalAuthor = Boolean(
    originalAuthorDisplayName &&
      (!viewerUserId ||
        !originalAuthorUserId ||
        originalAuthorUserId !== viewerUserId),
  );
  const overrideFields = listActiveOverrideFields(provenance.overrides);

  return {
    eventId: event.id,
    provenance,
    projectionMode: provenance.projectionMode,
    visibility: provenance.visibility,
    viewerScope: provenance.viewerScope,
    syncState: provenance.sync.state,
    lastSyncedAtIso: provenance.sync.lastSyncedAtIso ?? null,
    viewerRole: provenance.permissions.viewerRole,
    editMode: provenance.permissions.editMode,
    reshareMode: provenance.permissions.reshareMode,
    deleteMode: provenance.permissions.deleteMode,
    deleteIntent:
      provenance.permissions.deleteMode === "local_only"
        ? "detach_local"
        : provenance.permissions.deleteMode === "blocked"
          ? "blocked"
          : "delete_upstream",
    hasLocalOverrides: overrideFields.length > 0,
    overrideFields,
    overridesUpdatedAtIso: provenance.overrides?.updatedAtIso ?? null,
    sourceKind: provenance.origin.sourceKind,
    originalAuthorDisplayName,
    originalAuthorUserId,
    showOriginalAuthor,
    authoredAtIso: provenance.origin.authoredAtIso ?? null,
    mirroredAtIso: provenance.origin.mirroredAtIso ?? null,
    bridgeId: provenance.bridge.bridgeId ?? null,
    peerThreadId: provenance.bridge.peerThreadId ?? null,
    sharedGlobeId: provenance.bridge.sharedGlobeId ?? null,
    sharedGlobePinId: provenance.bridge.sharedGlobePinId ?? null,
    originEventId: provenance.origin.originEventId ?? null,
    originCaptureId: provenance.origin.originCaptureId ?? null,
    originNodeId: provenance.origin.originNodeId ?? null,
    attribution: provenance.integrity.attribution,
    placeBasis: provenance.integrity.placeBasis,
    timeBasis: provenance.integrity.timeBasis,
    originality: provenance.integrity.originality,
    completeness: provenance.integrity.completeness,
    auditCount: readMirrorAudit(event.metadata).length,
  };
}
