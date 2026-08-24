"use client";

/**
 * Globe Resume list — In progress (only when living work exists) · Recent · Friends.
 */

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  buildGlobeResumeSidebarModel,
  type ResumeFriendRow,
  type ResumeWorkspaceRow,
} from "@/lib/globe/resume-sidebar/build-globe-resume-sidebar-model";
import { resumeCapsuleWorkspace } from "@/lib/context-workspace/resume-capsule-workspace";
import {
  requestOpenLiveWorkChat,
  subscribeLiveWorks,
} from "@/lib/globe/live-work/live-work-store";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";
import type { SocialBubblePeer } from "@/lib/social/bubble-state";
import { PcContinuityPreviewCard } from "@/components/pc-continuity-preview-card";
import { GlobeResumeDeviceSection } from "@/components/globe/globe-resume-device-section";
import { readLiveWork } from "@/lib/globe/live-work/live-work-store";

export type GlobeResumeSidebarListProps = {
  readonly activeEventId?: string | null;
  readonly socialPeers?: readonly SocialBubblePeer[] | null;
  readonly query?: string;
  readonly revision?: number;
  readonly onWorkspaceOpened?: (contextEventId: string) => void;
  readonly onWorkspaceFallback?: (contextEventId: string) => void;
  readonly onFriendOpened?: (peerThreadId: string) => void;
  readonly className?: string;
};

function WorkspaceRowButton({
  row,
  onOpen,
}: {
  row: ResumeWorkspaceRow;
  onOpen: (row: ResumeWorkspaceRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      data-resume-workspace={row.contextEventId}
      data-resume-kind="workspace"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
        row.live
          ? "bg-white/10 text-white"
          : "text-white/85 hover:bg-white/[0.06] active:bg-white/10",
      )}
    >
      <span
        className={cn(
          "mt-0.5 size-2 shrink-0 rounded-full",
          row.live ? "bg-emerald-400" : "bg-white/25",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-medium leading-snug">
            {row.title}
          </span>
          <span className="shrink-0 text-[11px] text-white/40">
            {row.relativeLabel}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/45">
          {row.workPhase ? (
            <span className="truncate">{row.subtitle}</span>
          ) : (
            <>
              <span>{copy.globe.resumeSidebarWorkspaceKind}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{row.subtitle}</span>
            </>
          )}
        </span>
      </span>
    </button>
  );
}

function FriendRowButton({
  row,
  onOpen,
}: {
  row: ResumeFriendRow;
  onOpen: (row: ResumeFriendRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      data-resume-friend={row.peerThreadId}
      data-resume-kind="friend"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
        row.live
          ? "bg-white/10 text-white"
          : "text-white/85 hover:bg-white/[0.06] active:bg-white/10",
      )}
    >
      <span
        className={cn(
          "mt-0.5 size-2 shrink-0 rounded-full",
          row.live ? "bg-[#3182f6]" : "bg-transparent ring-1 ring-white/30",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-medium leading-snug">
            {row.title}
          </span>
          <span className="shrink-0 text-[11px] font-medium text-white/45">
            {row.live && row.unreadCount > 0
              ? copy.globe.resumeSidebarLive
              : row.relativeLabel}
          </span>
        </span>
        {row.preview ? (
          <span className="mt-0.5 block truncate text-[11px] text-white/45">
            {row.preview}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function SectionLabel({
  children,
  count,
}: {
  children: ReactNode;
  count?: number;
}) {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
      <span>{children}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="normal-case tracking-normal text-white/30">
          ({count})
        </span>
      ) : null}
    </p>
  );
}

export function GlobeResumeSidebarList({
  activeEventId = null,
  socialPeers = null,
  query = "",
  revision = 0,
  onWorkspaceOpened,
  onWorkspaceFallback,
  onFriendOpened,
  className,
}: GlobeResumeSidebarListProps) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [inspectWorkId, setInspectWorkId] = useState<string | null>(null);
  const [inspectDeviceId, setInspectDeviceId] = useState<string | null>(null);

  useEffect(() => {
    return subscribeLiveWorks(() => setTick((n) => n + 1));
  }, []);

  const model = buildGlobeResumeSidebarModel({
    activeEventId,
    socialPeers,
  });
  void revision;
  void tick;

  const needle = query.trim().toLowerCase();
  const matchWork = (row: ResumeWorkspaceRow) =>
    row.title.toLowerCase().includes(needle) ||
    row.subtitle.toLowerCase().includes(needle);
  const inProgress = needle
    ? model.inProgress.filter(matchWork)
    : model.inProgress;
  const pinned = needle ? model.pinned.filter(matchWork) : model.pinned;
  const friends = needle
    ? model.friends.filter(
        (row) =>
          row.title.toLowerCase().includes(needle) ||
          (row.preview?.toLowerCase().includes(needle) ?? false),
      )
    : model.friends;
  const recent = needle ? model.recent.filter(matchWork) : model.recent;

  const inspect = inspectWorkId ? readLiveWork(inspectWorkId) : null;

  const openWorkspace = (row: ResumeWorkspaceRow) => {
    if (row.liveWorkId) {
      setInspectWorkId(row.liveWorkId);
      requestOpenLiveWorkChat(row.contextEventId);
      return;
    }
    const resumed = resumeCapsuleWorkspace({
      contextEventId: row.contextEventId,
      utterance: row.title,
      expand: true,
    });
    if (resumed) {
      toast.message(copy.globe.workspaceResumeToast);
      onWorkspaceOpened?.(row.contextEventId);
      return;
    }
    if (onWorkspaceFallback) {
      onWorkspaceFallback(row.contextEventId);
      return;
    }
    toast.message(copy.globe.resumeSidebarWorkspaceOpenFailed);
  };

  const openFriend = (row: ResumeFriendRow) => {
    const id = row.peerThreadId.trim();
    if (!id) return;
    onFriendOpened?.(id);
    router.push(`/peers/${encodeURIComponent(id)}`);
  };

  if (inspect) {
    return (
      <div className={cn("space-y-3 px-0.5", className)} data-live-work-inspect>
        <button
          type="button"
          onClick={() => setInspectWorkId(null)}
          className="px-2 text-[12px] text-white/50"
        >
          {copy.globe.containerSpaceRuntimeBack}
        </button>
        <PcContinuityPreviewCard
          taskId={inspect.pcTaskId ?? inspect.id.replace(/^pc:/, "")}
          title={inspect.title}
          deviceName={inspect.deviceName}
          contextEventId={inspect.contextEventId}
        />
      </div>
    );
  }

  if (inspectDeviceId) {
    return (
      <GlobeResumeDeviceSection
        inspectDeviceId={inspectDeviceId}
        onInspect={setInspectDeviceId}
        onBack={() => setInspectDeviceId(null)}
      />
    );
  }

  const empty =
    inProgress.length === 0 &&
    pinned.length === 0 &&
    friends.length === 0 &&
    recent.length === 0;

  return (
    <div className={cn("space-y-4", className)} data-globe-resume-sidebar>
      <GlobeResumeDeviceSection
        inspectDeviceId={null}
        onInspect={setInspectDeviceId}
        onBack={() => setInspectDeviceId(null)}
      />
      {empty ? (
        <p
          className="px-2 py-4 text-[13px] leading-relaxed text-white/45"
          data-globe-resume-empty
        >
          {copy.globe.resumeSidebarEmpty.split("\n").map((line) => (
            <span key={line}>
              {line}
              <br />
            </span>
          ))}
        </p>
      ) : null}
      {inProgress.length > 0 ? (
        <section data-globe-resume-in-progress>
          <SectionLabel count={inProgress.length}>
            {copy.globe.resumeSidebarInProgress}
          </SectionLabel>
          <div className="space-y-px">
            {inProgress.map((row) => (
              <WorkspaceRowButton
                key={`live-${row.liveWorkId ?? row.contextEventId}`}
                row={row}
                onOpen={openWorkspace}
              />
            ))}
          </div>
        </section>
      ) : null}

      {pinned.length > 0 ? (
        <section data-globe-resume-pinned>
          <SectionLabel>{copy.globe.resumeSidebarPinned}</SectionLabel>
          <div className="space-y-px">
            {pinned.map((row) => (
              <WorkspaceRowButton
                key={`pin-${row.contextEventId}`}
                row={row}
                onOpen={openWorkspace}
              />
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section data-globe-resume-recent>
          <SectionLabel>{copy.globe.resumeSidebarRecent}</SectionLabel>
          <div className="space-y-px">
            {recent.map((row) => (
              <WorkspaceRowButton
                key={`recent-${row.contextEventId}`}
                row={row}
                onOpen={openWorkspace}
              />
            ))}
          </div>
        </section>
      ) : null}

      {friends.length > 0 ? (
        <section data-globe-resume-friends>
          <SectionLabel count={friends.length}>
            {copy.globe.resumeSidebarFriends}
          </SectionLabel>
          <div className="space-y-px">
            {friends.map((row) => (
              <FriendRowButton
                key={row.peerThreadId}
                row={row}
                onOpen={openFriend}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
