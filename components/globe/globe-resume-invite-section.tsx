"use client";

/**
 * Resume sidebar — pending Workspace invites with ✓ / ✗.
 */

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  usePendingBridgeInvites,
  type PendingBridgeInvite,
} from "@/hooks/use-pending-bridge-invites";
import {
  acceptExperienceBridgeRemote,
  declineExperienceBridgeRemote,
} from "@/lib/experience-bridge/experience-bridge-client";
import { writeLocalBridgeState } from "@/lib/experience-bridge/local-bridge-store";
import { commitWorkspaceInviteAccept } from "@/lib/context-workspace/commit-workspace-invite-accept";
import { useAuth } from "@/hooks/use-auth";
import { copy } from "@/lib/copy/human-ko";
import { cn } from "@/lib/utils";

export type GlobeResumeInviteSectionProps = {
  readonly enabled?: boolean;
  readonly onAccepted?: (contextEventId: string) => void;
  readonly className?: string;
};

export function GlobeResumeInviteSection({
  enabled = true,
  onAccepted,
  className,
}: GlobeResumeInviteSectionProps) {
  const { user } = useAuth();
  const { invites, dismissInvite, hasInvites } = usePendingBridgeInvites(enabled);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!hasInvites) return null;

  const accept = async (row: PendingBridgeInvite) => {
    const eventId = row.state.bridge.eventId.trim();
    if (!eventId || busyId) return;
    setBusyId(eventId);
    try {
      const data = await acceptExperienceBridgeRemote(eventId);
      const committed = await commitWorkspaceInviteAccept({
        state: data.state,
        peerThreadId: data.pinSpec?.peerThreadId ?? row.state.bridge.peerThreadId,
        viewerUserId: user?.id,
        viewerDisplayName: user?.email ?? null,
      });
      dismissInvite(eventId);
      toast.success(copy.globe.workspaceInviteCommitToast);
      onAccepted?.(committed.contextEventId);
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : copy.globe.bridgeInviteAcceptFail,
      );
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (row: PendingBridgeInvite) => {
    const eventId = row.state.bridge.eventId.trim();
    if (!eventId || busyId) return;
    setBusyId(eventId);
    try {
      const data = await declineExperienceBridgeRemote(eventId);
      writeLocalBridgeState(data.state);
      dismissInvite(eventId);
      toast.message(copy.globe.bridgeInviteDeclined);
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : copy.globe.bridgeInviteDeclineFail,
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={cn("mb-4", className)} data-globe-resume-invites>
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/35">
        {copy.globe.resumeSidebarInvites}
      </p>
      <div className="space-y-px">
        {invites.map((row) => {
          const eventId = row.state.bridge.eventId;
          const host =
            row.state.participants.find((p) => p.role === "host")?.displayName?.trim() ||
            copy.globe.bridgeInviteHostFallback;
          const title =
            row.state.bridge.title?.trim() ||
            row.state.bridge.placeLabel?.trim() ||
            copy.globe.bridgeInvitePlaceFallback;
          const busy = busyId === eventId;
          return (
            <div
              key={eventId}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-white/90"
              data-resume-invite={eventId}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium leading-snug">
                  {title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-white/45">
                  {copy.globe.resumeSidebarInviteFrom(host)}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                aria-label={copy.globe.bridgeInviteAcceptCta}
                onClick={() => void accept(row)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/90 text-white active:scale-95 disabled:opacity-50"
                data-resume-invite-accept
              >
                <Check className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={copy.globe.bridgeInviteDeclineCta}
                onClick={() => void decline(row)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/15 active:scale-95 disabled:opacity-50"
                data-resume-invite-decline
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
