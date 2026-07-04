"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/copy/human-ko";
import { deleteGlobeContexts } from "@/lib/globe/delete-globe-context";
import type { MirrorProvenanceSummary } from "@/lib/globe/mirror-provenance";
import { cn } from "@/lib/utils";

export type GlobeContextProvenanceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: MirrorProvenanceSummary | null;
  onDeleted?: () => void;
};

function formatWhen(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function visibilityLine(summary: MirrorProvenanceSummary): string {
  switch (summary.viewerScope) {
    case "peer_thread":
      return copy.globe.provenanceVisibilityPeerThread;
    case "bridge_participants":
      return copy.globe.provenanceVisibilityBridgeParticipants;
    case "shared_globe_members":
      return copy.globe.provenanceVisibilitySharedGlobeMembers;
    case "external_discovery":
      return copy.globe.provenanceVisibilityExternal;
    case "private_self":
    default:
      return copy.globe.provenanceVisibilityPrivateSelf;
  }
}

function statusLine(summary: MirrorProvenanceSummary): string {
  switch (summary.syncState) {
    case "pending_pull":
      return copy.globe.provenanceStatusPendingPullLine;
    case "pending_push":
      return copy.globe.provenanceStatusPendingPushLine;
    case "conflict":
      return copy.globe.provenanceStatusConflictLine;
    case "detached":
      return copy.globe.provenanceStatusDetachedLine;
    case "source_deleted":
      return copy.globe.provenanceStatusSourceDeletedLine;
    case "synced":
    default:
      return summary.hasLocalOverrides
        ? copy.globe.provenanceStatusLocalOverrideLine
        : copy.globe.provenanceStatusSyncedLine;
  }
}

function editLine(summary: MirrorProvenanceSummary): string {
  switch (summary.editMode) {
    case "local_edits":
      return copy.globe.provenancePermissionsLocalEdits;
    case "read_only":
      return copy.globe.provenancePermissionsReadOnly;
    case "owner_only":
    default:
      return copy.globe.provenancePermissionsOwnerOnly;
  }
}

function reshareLine(summary: MirrorProvenanceSummary): string {
  switch (summary.reshareMode) {
    case "owner_only":
      return copy.globe.provenanceReshareOwnerOnly;
    case "blocked":
      return copy.globe.provenanceReshareBlocked;
    case "allowed":
    default:
      return copy.globe.provenanceReshareAllowed;
  }
}

function deleteLine(summary: MirrorProvenanceSummary): string {
  switch (summary.deleteMode) {
    case "local_only":
      return copy.globe.provenanceDeleteLocalOnly;
    case "blocked":
      return copy.globe.provenanceDeleteBlocked;
    case "owner_only":
    default:
      return copy.globe.provenanceDeleteOwnerOnly;
  }
}

function projectionModeLabel(value: MirrorProvenanceSummary["projectionMode"]): string {
  switch (value) {
    case "shared":
      return copy.globe.provenanceChipSharedOut;
    case "shared_mirrored":
      return copy.globe.provenanceChipSharedIn;
    case "mirrored":
      return copy.globe.provenanceChipMirrored;
    case "personal":
    default:
      return copy.globe.provenanceChipMine;
  }
}

function sourceKindLabel(value: MirrorProvenanceSummary["sourceKind"]): string {
  switch (value) {
    case "bridge_share":
      return "함께하기";
    case "bridge_participant":
      return "함께한 맥락 받기";
    case "peer_shared_globe_pin":
      return "대화 핀 받기";
    case "personal_capture":
    default:
      return "내 기록";
  }
}

function integrityValueLabel(value: string): string {
  switch (value) {
    case "self":
      return "내가 남김";
    case "bridge_host":
      return "원본 작성자 유지";
    case "friend":
      return "친구 표시";
    case "mixed":
      return "혼합";
    case "unknown":
      return "미상";
    case "direct":
      return "직접";
    case "shared":
      return "공유";
    case "inferred":
      return "추정";
    case "original":
      return "원본";
    case "shared_copy":
      return "공유본";
    case "mirror_copy":
      return "미러본";
    case "complete":
      return "충분";
    case "partial":
      return "일부";
    case "minimal":
      return "기본";
    default:
      return value;
  }
}

function roleLabel(summary: MirrorProvenanceSummary): string {
  switch (summary.viewerRole) {
    case "host":
      return "지금 역할 · 함께 남기는 사람";
    case "participant":
      return "지금 역할 · 함께 보는 사람";
    case "recipient":
      return "지금 역할 · 받아 둔 사람";
    case "viewer":
      return "지금 역할 · 보기만";
    case "owner":
    default:
      return "지금 역할 · 원본 작성자";
  }
}

function overrideFieldLabel(field: MirrorProvenanceSummary["overrideFields"][number]): string {
  switch (field) {
    case "title":
      return "제목";
    case "place":
      return "장소";
    case "note":
      return "메모";
    default:
      return field;
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function Section({
  title,
  body,
  detail,
}: {
  title: string;
  body: string;
  detail?: string | null;
}) {
  return (
    <section className="rounded-2xl bg-muted/35 px-3.5 py-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{title}</p>
      <p className="mt-1 text-[14px] font-medium leading-snug text-foreground">{body}</p>
      {detail ? (
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{detail}</p>
      ) : null}
    </section>
  );
}

export function GlobeContextProvenanceSheet({
  open,
  onOpenChange,
  summary,
  onDeleted,
}: GlobeContextProvenanceSheetProps) {
  const [deleting, setDeleting] = useState(false);
  const originSubline = useMemo(() => {
    if (!summary) {
      return null;
    }
    return formatWhen(summary.authoredAtIso);
  }, [summary]);

  const mirroredAtLine = useMemo(() => {
    if (!summary) {
      return null;
    }
    const formatted = formatWhen(summary.mirroredAtIso);
    return formatted ? copy.globe.provenanceOriginMirroredAt(formatted) : null;
  }, [summary]);

  const lastSyncedLine = useMemo(() => {
    if (!summary) {
      return null;
    }
    const formatted = formatWhen(summary.lastSyncedAtIso);
    return formatted ? `${formatted} 동기화` : null;
  }, [summary]);

  const overrideLine = useMemo(() => {
    if (!summary || summary.overrideFields.length === 0) {
      return null;
    }
    return summary.overrideFields.map((field) => overrideFieldLabel(field)).join(" · ");
  }, [summary]);

  const detailRows = useMemo(() => {
    if (!summary) {
      return [];
    }
    return [
      {
        label: copy.globe.provenanceDetailProjectionMode,
        value: projectionModeLabel(summary.projectionMode),
      },
      {
        label: copy.globe.provenanceDetailSource,
        value: sourceKindLabel(summary.sourceKind),
      },
      ...(summary.overrideFields.length > 0 && overrideLine
        ? [{ label: copy.globe.provenanceDetailOverrides, value: overrideLine }]
        : []),
      ...(lastSyncedLine
        ? [{ label: copy.globe.provenanceDetailLastSynced, value: lastSyncedLine }]
        : []),
      ...(summary.bridgeId
        ? [{ label: copy.globe.provenanceDetailBridgeId, value: summary.bridgeId }]
        : []),
      ...(summary.peerThreadId
        ? [{ label: copy.globe.provenanceDetailPeerThread, value: summary.peerThreadId }]
        : []),
      ...(summary.sharedGlobeId
        ? [{ label: copy.globe.provenanceDetailSharedGlobeId, value: summary.sharedGlobeId }]
        : []),
      ...(summary.sharedGlobePinId
        ? [
            {
              label: copy.globe.provenanceDetailSharedGlobePinId,
              value: summary.sharedGlobePinId,
            },
          ]
        : []),
      ...(summary.originEventId
        ? [
            {
              label: copy.globe.provenanceDetailOriginEventId,
              value: summary.originEventId,
            },
          ]
        : []),
      ...(summary.originCaptureId
        ? [
            {
              label: copy.globe.provenanceDetailOriginCaptureId,
              value: summary.originCaptureId,
            },
          ]
        : []),
      ...(summary.originNodeId
        ? [
            {
              label: copy.globe.provenanceDetailOriginNodeId,
              value: summary.originNodeId,
            },
          ]
        : []),
      {
        label: copy.globe.provenanceDetailAttribution,
        value: integrityValueLabel(summary.attribution),
      },
      {
        label: copy.globe.provenanceDetailPlaceBasis,
        value: integrityValueLabel(summary.placeBasis),
      },
      {
        label: copy.globe.provenanceDetailTimeBasis,
        value: integrityValueLabel(summary.timeBasis),
      },
      {
        label: copy.globe.provenanceDetailOriginality,
        value: integrityValueLabel(summary.originality),
      },
      {
        label: copy.globe.provenanceDetailCompleteness,
        value: integrityValueLabel(summary.completeness),
      },
      {
        label: copy.globe.provenanceSectionDetails,
        value: copy.globe.provenanceDetailAuditCount(summary.auditCount),
      },
    ];
  }, [lastSyncedLine, overrideLine, summary]);

  const handleDelete = async () => {
    if (!summary || deleting || summary.deleteIntent === "blocked") {
      return;
    }
    const confirmed = window.confirm(
      summary.deleteIntent === "detach_local"
        ? copy.globe.provenanceDeleteConfirmDetach
        : copy.globe.provenanceDeleteConfirmDeleteUpstream,
    );
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    try {
      const { results } = await deleteGlobeContexts([summary.eventId]);
      const result = results[0];
      if (!result || result.skipped) {
        toast.error("지우지 못했어요");
        return;
      }
      toast.success(
        result.action === "detach_local"
          ? copy.globe.provenanceDeleteDetachedToast
          : copy.globe.provenanceDeleteUpstreamToast,
      );
      onOpenChange(false);
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  };

  if (typeof document === "undefined" || !summary) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10063] bg-black/40"
            onClick={() => onOpenChange(false)}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={copy.globe.provenanceSheetTitle}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[10064] mx-auto flex w-full max-w-lg flex-col",
              "max-h-[min(82dvh,620px)] overflow-hidden rounded-t-[1.25rem] border border-border bg-card shadow-2xl",
            )}
            data-globe-context-provenance-sheet
          >
            <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
                    <ShieldCheck className="size-4 text-primary" aria-hidden />
                    {copy.globe.provenanceSheetTitle}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {copy.globe.provenanceSheetBody}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full active:bg-muted"
                  aria-label="닫기"
                >
                  <X className="size-5 text-muted-foreground" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Section
                title={copy.globe.provenanceSectionVisibility}
                body={visibilityLine(summary)}
                detail={summary.visibility === "external" ? "밖 지구 공개 포함" : null}
              />
              <Section
                title={copy.globe.provenanceSectionOrigin}
                body={
                  summary.showOriginalAuthor && summary.originalAuthorDisplayName
                    ? copy.globe.provenanceOriginByAuthor(
                        summary.originalAuthorDisplayName,
                      )
                    : copy.globe.provenanceOriginUnknown
                }
                detail={[originSubline, mirroredAtLine].filter(Boolean).join(" · ") || null}
              />
              <Section
                title={copy.globe.provenanceSectionStatus}
                body={statusLine(summary)}
                detail={
                  summary.hasLocalOverrides
                    ? [overrideLine, lastSyncedLine].filter(Boolean).join(" · ") || null
                    : summary.syncState === "synced"
                      ? lastSyncedLine
                      : [lastSyncedLine, "필요할 때만 확인하면 돼요"]
                          .filter(Boolean)
                          .join(" · ")
                }
              />
              <Section
                title={copy.globe.provenanceSectionPermissions}
                body={editLine(summary)}
                detail={[roleLabel(summary), reshareLine(summary), deleteLine(summary)]
                  .filter(Boolean)
                  .join(" · ")}
              />
              {summary.deleteIntent !== "blocked" ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-2xl px-3.5 py-3 text-[14px] font-semibold active:scale-[0.99]",
                    summary.deleteIntent === "detach_local"
                      ? "border border-border bg-card text-foreground"
                      : "bg-destructive text-destructive-foreground",
                  )}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {deleting
                    ? "처리하는 중…"
                    : summary.deleteIntent === "detach_local"
                      ? copy.globe.provenanceDeleteActionDetachLocal
                      : copy.globe.provenanceDeleteActionDeleteUpstream}
                </button>
              ) : null}

              <details className="rounded-2xl bg-muted/35 px-3.5 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span>
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      {copy.globe.provenanceSectionDetails}
                    </span>
                    <span className="mt-1 block text-[13px] text-foreground">
                      {copy.globe.provenanceSectionDetailsHint}
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </summary>
                <div className="mt-3 space-y-2.5">
                  {detailRows.map((row) => (
                    <DetailRow key={`${row.label}:${row.value}`} label={row.label} value={row.value} />
                  ))}
                </div>
              </details>
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
